#pragma once

#include "ebu/list/rtp/listener.h"
#include "ebu/list/core/memory/bimo.h"
#include "ebu/list/serialization/serializable_stream_info.h"
#include "ebu/list/serialization/audio_serialization.h"

namespace ebu_list
{
    struct sample_info
    {
        uint32_t timestamp = 0;
    };

    struct sample : sample_info
    {
        std::vector<sbuffer_ptr> buffer; // one position for each channel
    };
    using sample_uptr = std::unique_ptr<sample>;

    class audio_stream_handler : public rtp::listener
    {
    public:
        using completion_handler = std::function<void(const audio_stream_handler& ash)>;

        audio_stream_handler(rtp::packet first_packet, serializable_stream_info info, audio_stream_details details, completion_handler ch);

        const audio_stream_details& info() const;
        const serializable_stream_info& network_info() const;

    private:
#pragma region rtp::listener events
        void on_data(const rtp::packet& packet) override;

        void on_complete() override;

        void on_error(std::exception_ptr e) override;
#pragma endregion udp::listener events

#pragma region event handlers
        virtual void on_sample(sample_uptr sample) = 0;
        virtual void on_stream_complete() = 0;
#pragma endregion event handlers

        void new_sample();
        void parse_packet(const rtp::packet& packet);

        sample_uptr current_sample_;
        malloc_sbuffer_factory block_factory_;

        serializable_stream_info info_;
        audio_stream_details audio_description_;

        completion_handler completion_handler_;
    };

    using audio_stream_handler_uptr = std::unique_ptr<audio_stream_handler>;
}
