#include "ebu/list/pcap/player.h"
#include "ebu/list/core/memory/bimo.h"
#include "ebu/list/core/io/file_source.h"
#include "ebu/list/pcap/reader.h"
#include "ebu/list/net/ethernet/decoder.h"
#include "ebu/list/net/ipv4/decoder.h"
#include "ebu/list/net/udp/decoder.h"

using namespace ebu_list::pcap;
using namespace ebu_list;

//------------------------------------------------------------------------------

pcap_player::pcap_player(path pcap_file, udp::listener_ptr listener, clock::duration packet_timestamp_correction)
    : listener_(std::move(listener)),
    packet_timestamp_correction_(packet_timestamp_correction),
    bf_(std::make_shared<malloc_sbuffer_factory>()),
    source_(bf_, std::make_unique<file_source>(bf_, pcap_file)),
    file_header_(pcap::read_header(source_))
{
    if (!file_header_)
    {
        done_ = true;
        logger()->critical("Not a valid pcap file");
        return;
    }
}

pcap_player::pcap_player(path pcap_file, udp::listener_ptr listener)
    : pcap_player(std::move(pcap_file), std::move(listener), clock::duration{})
{
}

bool pcap_player::next()
{
    if (done_) return false;

    try
    {
        do_next();
    }
    catch (...)
    {
        listener_->on_error(std::current_exception());
        return false;
    }

    return !done_;
}

void pcap_player::do_next()
{
    while (!done_)
    {
        auto maybe_packet = pcap::read_packet(file_header_.value()(), source_);
        if (!maybe_packet)
        {
            listener_->on_complete();
            done_ = true;
            return;
        }

        auto& packet = maybe_packet.value();
        const auto packet_timestamp = packet.pcap_header.view().timestamp() + packet_timestamp_correction_;

        auto[ethernet_header, ethernet_payload] = ethernet::decode(std::move(packet.data));
        if (ethernet_header.type != ethernet::payload_type::IPv4) continue;

        auto[ipv4_header, ipv4_payload] = ipv4::decode(std::move(ethernet_payload));
        if (ipv4_header.type != ipv4::protocol_type::UDP) continue;

        auto[udp_header, udp_payload] = udp::decode(std::move(ipv4_payload));

        auto datagram = udp::make_datagram(packet_timestamp,
            ipv4_header.source_address, udp_header.source_port,
            ipv4_header.destination_address, udp_header.destination_port,
            std::move(udp_payload));

        listener_->on_data(std::move(datagram));

        return;
    }
}
