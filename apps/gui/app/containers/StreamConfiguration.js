import React, { Component } from 'react';
import { find, merge } from 'lodash';
import asyncLoader from 'components/asyncLoader';
import FormInput from 'components/common/FormInput';
import { translate } from 'utils/translation';
import Select from 'react-select';
import api from 'utils/api';
import Icon from 'components/common/Icon';
import Input from 'components/common/Input';
import Alert from 'components/common/Alert';
import ButtonGroup from 'components/common/ButtonGroup';
import Button from 'components/common/Button';
import keyEnum from 'enums/keyEnum';
import { getVideoProfiles,
         getAudioProfiles,
         getMediaSpecificInformationByProfile,
         getAudioInformationByProfile
} from 'code-for-demos/video-presets';
import { deepClone } from 'utils/clone';
import notifications from 'utils/notifications';
import Panel from 'components/common/Panel';

class StreamConfiguration extends Component {
    constructor(props) {
        super(props);

        this.state = {
            stream: deepClone(this.props.stream),
            profile: null,
            isSendingInformation: false
        };

        this.selectMediaType = this.selectMediaType.bind(this);
        this.sendStreamsConfiguration = this.sendStreamsConfiguration.bind(this);
        this.sendStreamInformation = this.sendStreamInformation.bind(this);
        this.autoFillInfo = this.autoFillInfo.bind(this);

        window.addEventListener(keyEnum.EVENTS.KEY_UP, this.sendStreamInformation);
    }

    updateStreamsConfigurationState(nextObject) {
        this.setState( prevState => {
            const stream = Object.assign({}, prevState.stream);
            merge(stream, nextObject);
            return { stream };
        });
    }

    selectMediaType(option) {
        let mediaSpecific = null;

        // This will verify if the stream type is the same of the heuristic results
        if (option.value === this.props.stream.media_type) {
            mediaSpecific = this.props.stream.media_specific;
        }

        this.updateStreamsConfigurationState({
            media_type: option.value,
            media_specific: mediaSpecific,
            profile: null,
        });

        if (option.value === 'video') {
            this.autoFillInfo(null, getMediaSpecificInformationByProfile);
        } else if (option.value === 'audio') {
            this.autoFillInfo(null, getAudioInformationByProfile);
        }
    }

    sendStreamInformation(evt) {
        if (evt.key === keyEnum.ENTER) {
            this.sendStreamsConfiguration();
        }
    }

    renderFormGroupHeader(groupLabel, icon) {
        return (
            <React.Fragment>
                <h2>
                    <Icon value={icon} />
                    <span>{translate(groupLabel)}</span>
                </h2>
                <hr />
            </React.Fragment>
        );
    }

    updateMediaSpecific(attribute, value) {
        const mediaSpecific = this.state.stream.media_specific || {};
        const newMediaSpecific = Object.assign(
            mediaSpecific,
            { [attribute]: value }
        );

        this.updateStreamsConfigurationState({ media_specific: newMediaSpecific });
    }

    autoFillInfo(event, mediaSpecificFunction) {
        const newProfile = event ? event.value : null;
        this.setState({ profile: newProfile });

        this.updateStreamsConfigurationState({ media_specific: mediaSpecificFunction(newProfile) });
    }

    renderVideoInformation() {
        const samplingOptions = find(this.props.availableVideoOptions, { key: 'sampling' }).value;
        const colorimetryOptions = find(this.props.availableVideoOptions, { key: 'colorimetry' }).value;
        const scanOptions = find(this.props.availableVideoOptions, { key: 'scan_type' }).value;
        const rateOptions = find(this.props.availableVideoOptions, { key: 'rate' }).value;
        const mediaSpecific = this.state.stream.media_specific;

        return (
            <React.Fragment>
                <FormInput label="Video Profiles">
                    <Select
                        value={this.state.profile}
                        searchable
                        clearable={true}
                        options={this.props.videoProfiles}
                        onChange={ option => this.autoFillInfo(option, getMediaSpecificInformationByProfile)}
                    />
                </FormInput>
                <FormInput label={translate('sampling')}>
                    <Select
                        value={mediaSpecific ? mediaSpecific.sampling : null}
                        searchable
                        clearable={false}
                        options={samplingOptions}
                        onChange={option => this.updateMediaSpecific('sampling', option ? option.value : null)}
                    />
                </FormInput>
                <FormInput label={translate('color_depth')}>
                    <Input
                        type="number"
                        value={mediaSpecific.color_depth || 0}
                        min="8"
                        max="32"
                        onChange={evt => this.updateMediaSpecific('color_depth', parseInt(evt.currentTarget.value, 10))}
                    />
                </FormInput>
                <FormInput label={translate('width')}>
                    <Input
                        type="number"
                        value={mediaSpecific.width || 0}
                        min="0"
                        max="32"
                        onChange={evt => this.updateMediaSpecific('width', parseInt(evt.currentTarget.value, 10))}
                    />
                </FormInput>
                <FormInput label={translate('height')}>
                    <Input
                        type="number"
                        value={mediaSpecific.height || 0}
                        min="0"
                        max="32"
                        onChange={evt => this.updateMediaSpecific('height', parseInt(evt.currentTarget.value, 10))}
                    />
                </FormInput>
                <FormInput label={translate('scan_type')}>
                    <ButtonGroup
                        type="info"
                        options={scanOptions}
                        selected={mediaSpecific ? mediaSpecific.scan_type : 'progressive'}
                        onChange={option => this.updateMediaSpecific('scan_type', option ? option.value : null)}
                    />
                </FormInput>
                <FormInput label={translate('rate')}>
                    <Select
                        value={mediaSpecific ? mediaSpecific.rate : null}
                        searchable
                        clearable={false}
                        options={rateOptions}
                        onChange={option => this.updateMediaSpecific('rate', option ? option.value : null)}
                    />
                </FormInput>
                <FormInput label={translate('colorimetry')}>
                    <Select
                        value={mediaSpecific ? mediaSpecific.colorimetry : 'unknown'}
                        searchable
                        clearable={false}
                        options={colorimetryOptions}
                        onChange={option => this.updateMediaSpecific('colorimetry', option ? option.value : null)}
                    />
                </FormInput>
                <FormInput label={translate('packets_per_frame')}>
                    <Input
                        disabled
                        type="number"
                        value={mediaSpecific.packets_per_frame || 0}
                        onChange={evt => this.updateMediaSpecific('packets_per_frame', parseInt(evt.currentTarget.value, 10))}
                    />
                </FormInput>
            </React.Fragment>
        );
    }

    renderAudioInformation() {
        const encodingOptions = find(this.props.availableAudioOptions, { key: 'encoding' }).value;
        const sampleRateOptions = find(this.props.availableAudioOptions, { key: 'sample_rate' }).value;
        const packetTimeOptions = find(this.props.availableAudioOptions, { key: 'packet_time' }).value;
        const mediaSpecific = this.state.stream.media_specific;

        return (
            <React.Fragment>
                <FormInput label="Audio Profiles">
                    <Select
                        value={this.state.profile}
                        searchable
                        clearable={true}
                        options={this.props.audioProfiles}
                        onChange={option => this.autoFillInfo(option, getAudioInformationByProfile)}
                    />
                </FormInput>
                <FormInput label={translate('encoding')}>
                    <Select
                        value={mediaSpecific ? mediaSpecific.encoding : null}
                        searchable
                        clearable={false}
                        options={encodingOptions}
                        onChange={option => this.updateMediaSpecific('encoding', option ? option.value : null)}
                    />
                </FormInput>
                <FormInput label={translate('sampling')}>
                    <Select
                        value={mediaSpecific ? mediaSpecific.sampling : null}
                        searchable
                        clearable={false}
                        options={sampleRateOptions}
                        onChange={option => this.updateMediaSpecific('sampling', option ? option.value : null)}
                    />
                </FormInput>
                <FormInput label={translate('number_channels')}>
                    <Input
                        type="number"
                        value={mediaSpecific.number_channels || 1}
                        min="1"
                        max="8"
                        onChange={evt => this.updateMediaSpecific('number_channels', parseInt(evt.currentTarget.value, 10))}
                    />
                </FormInput>
                <FormInput label={translate('packet_time')}>
                    <Select
                        value={mediaSpecific ? mediaSpecific.packet_time : null}
                        searchable
                        clearable={false}
                        options={packetTimeOptions}
                        onChange={option => this.updateMediaSpecific('packet_time', option ? option.value : null)}
                    />
                </FormInput>
            </React.Fragment>
        );
    }

    renderMediaTypeInformation(mediaType) {
        switch (mediaType) {
        case 'video':
            return this.renderVideoInformation();
        case 'audio':
            return this.renderAudioInformation();
        case 'ancillary_data':
            return (
                <Alert type="info" showIcon>
                    <strong>{"Ancillary Data not yet supported"}</strong>
                    <p>{"You can mark this stream as Ancillary data, but it will not be analyzed yet."}</p>
                </Alert>);
        case 'unknown':
        default:
                return (
                <Alert type="danger" showIcon>
                    <strong>{translate('alerts.media_type_unknown')}</strong>
                    <p>{translate('information.media_type_unknown')}</p>
                </Alert>);
        }
    }

    renderMediaInformation() {
        return (
            <div className="col-xs-12 col-md-6">
                {this.renderFormGroupHeader('headings.media_information', 'filter')}
                <FormInput label={translate('media_type')}>
                    <ButtonGroup
                        type="info"
                        options={this.props.availableOptions}
                        selected={this.state.stream.media_type}
                        onChange={this.selectMediaType}
                    />
                </FormInput>
                {this.renderMediaTypeInformation(this.state.stream.media_type)}
            </div>
        );
    }

    renderNetworkInformation() {
        const properties = [
            'destination_address',
            'destination_port',
            'source_address',
            'source_port',
            'payload_type',
            'ssrc'
        ];

        return (
            <div className="col-xs-12 col-md-6">
                {this.renderFormGroupHeader('headings.network_information', 'settings ethernet')}
                {properties.map(property => (
                    <FormInput key={property} label={translate(property)}>
                        {this.props.stream.network_information[property]}
                    </FormInput>
                ))}
            </div>
        );
    }

    sendStreamsConfiguration() {
        const { pcapID, streamID } = this.props;

        this.setState({ isSendingInformation: true });

        api.sendStreamConfigurations(pcapID, streamID, this.state.stream)
            .then(() => {
                this.setState({ isSendingInformation: false });
                notifications.success({
                    title: 'Success!',
                    message: `The stream was successfully analysed!`
                });
                this.props.onStreamAnalyzed();
            })
            .catch((error) => {
                console.log(error);
                this.setState({ isSendingInformation: false });
                notifications.error({
                    title: 'Error!',
                    message: 'Something went wrong during the stream analysis!'
                });
            });
    }

    render() {
        const analyzed = this.props.stream.state === "analyzed";

        return (
            <React.Fragment>
                <Alert type={analyzed ? 'success' : 'warning'} showIcon>
                    <strong>
                        {analyzed
                            ? translate('alerts.stream_already_analyzed')
                            : translate('alerts.stream_missing_information')}!
                    </strong>
                    <p>
                        {analyzed
                            ? translate('information.stream_analyzed_information')
                            : translate('information.stream_missing_information')}
                    </p>
                </Alert>
                <Panel>
                    <div className="lst-sdp-config row lst-no-margin">
                        {this.renderNetworkInformation()}
                        {this.renderMediaInformation()}
                    </div>
                    <div className="row end-xs lst-text-right lst-no-margin">
                        <Button
                            type="info"
                            label="Analyze Stream"
                            disabled={this.state.isSendingInformation}
                            loading={this.state.isSendingInformation}
                            onClick={this.sendStreamsConfiguration}
                        />
                    </div>
                </Panel>
            </React.Fragment>
        );
    }

    componentWillUnmount() {
        window.removeEventListener(keyEnum.EVENTS.KEY_UP, this.sendStreamInformation);
    }
}

export default asyncLoader(StreamConfiguration, {
    asyncRequests: {
        stream: (props) => api.getStreamHelp(props.pcapID, props.streamID),

        availableOptions: () => api.getSDPAvailableOptions(),

        availableVideoOptions: () => api.getAvailableVideoOptions(),

        availableAudioOptions: () => api.getAvailableAudioOptions(),

        videoProfiles: () => getVideoProfiles(),

        audioProfiles: () => getAudioProfiles()
    }
});
