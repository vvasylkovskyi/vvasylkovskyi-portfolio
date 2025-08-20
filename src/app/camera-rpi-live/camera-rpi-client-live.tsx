'use client';
import {
  FullScreenLoadingSpinner,
  LoadingSpinner,
  ProgressLoader,
} from '@/components/atoms/loading-spinner/loading-spinner';
import { Button } from '@/components/ui/button';
import { ConnectionStatus } from '@/types/device-types';
import { useAuth } from '@clerk/nextjs';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GetDeviceInfoResponse } from '../api/get-device-info/get-device-info';
import './camera-rpi-client-live.scss';
import { useWebRTC } from './useWebRTC';

type CameraRpiClientLiveState = {
  isLoading: boolean;
  isLoaded: boolean;
  connectionStatus: ConnectionStatus;
  batteryLevel: string;
  cpuPercent: number;
  uptimeSeconds: number;
  batteryTemperature: string;
  batteryChargingStatus: string;
};

export const CameraRpiClientLive = () => {
  const { getToken } = useAuth();
  const videoRef: React.RefObject<HTMLVideoElement | null> = useRef<HTMLVideoElement | null>(null);
  const {
    startWebRTC,
    stopWebRTC,
    isLoading: isLoadingWebRTC,
    isStreaming,
    loadingMessage,
  } = useWebRTC({
    getToken: getToken as () => Promise<string>,
    videoRef,
  });

  const [state, setState] = useState<CameraRpiClientLiveState>({
    isLoading: false,
    isLoaded: false,
    connectionStatus: ConnectionStatus.Disconnected,
    batteryLevel: 'unknown',
    cpuPercent: 0,
    uptimeSeconds: 0,
    batteryTemperature: 'unknown',
    batteryChargingStatus: 'unknown',
  });

  const getDeviceInfo = useCallback(async () => {
    setState({ ...state, isLoading: true, isLoaded: false });
    const token = await getToken();
    const response = await fetch('/api/get-device-info', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data: GetDeviceInfoResponse = await response.json();

    setState((prevState) => ({
      ...prevState,
      connectionStatus: data.connectionStatus,
      batteryLevel: data.batteryLevel,
      cpuPercent: data.cpuPercent,
      uptimeSeconds: data.uptimeSeconds,
      batteryTemperature: data.batteryTemperature,
      batteryChargingStatus: data.batteryChargingStatus,
      isLoaded: true,
      isLoading: false,
    }));
  }, [getToken]);

  useEffect(() => {
    if (state.isLoading || state.isLoaded) {
      return;
    }

    getDeviceInfo();
  }, [state, getDeviceInfo]);

  if (state.isLoading || !state.isLoaded) {
    return <FullScreenLoadingSpinner message={'Collecting Device Info...'} />;
  }

  return (
    <React.Fragment>
      <div className='camera__container'>
        <div className='camera-stats-container'>
          <div className='camera-stats__item'>
            <div className='camera__connection-status'>
              <div
                className={`camera-stats__connection-dot camera-stats__connection-dot--${state.connectionStatus}`}
              ></div>
              <div className='camera-stats__label'>
                {state.connectionStatus === ConnectionStatus.Connected && <label>Connected</label>}
                {state.connectionStatus === ConnectionStatus.Disconnected && (
                  <label>Disconnected</label>
                )}
              </div>
            </div>
            <div className='camera__stats__item'>
              <span className='camera__stats__label'>Battery Level: </span>
              <span className='camera__stats__value'>{`${state.batteryLevel}`}</span>
            </div>
          </div>
          <div className='camera-stats__bottom'>
            <div className='camera-stats__item'>
              <span className='camera-stats__label'>CPU Usage: </span>
              <span className='camera-stats__value'>{`${state.cpuPercent}%`}</span>
            </div>
            <div className='camera-stats__item'>
              <span className='camera-stats__label'>Uptime: </span>
              <span className='camera-stats__value'>{`${state.uptimeSeconds}s`}</span>
            </div>
            <div className='camera-stats__item'>
              <span className='camera-stats__label'>Battery Temperature: </span>
              <span className='camera-stats__value'>{`${state.batteryTemperature}`}</span>
            </div>
            <div className='camera-stats__item'>
              <span className='camera-stats__label'>Battery Charging Status: </span>
              <span className='camera-stats__value'>{`${state.batteryChargingStatus}`}</span>
            </div>
          </div>
        </div>
        <div className='camera__layout-wrapper'>
          <div
            className={`player-component-wrapper ${!isStreaming ? 'player-component-wrapper--hidden' : ''}`}
          >
            <video
              ref={videoRef}
              controls
              autoPlay
              muted
              playsInline
              className='video-component'
              style={{ width: '100%', height: '100%', background: 'black' }}
            />
          </div>

          {!isStreaming && isLoadingWebRTC && (
            <div className='player-component-wrapper player-loading-wrapper'>
              <div className='loading-spinner__container'>
                <ProgressLoader />
              </div>
              <p>{loadingMessage}</p>
            </div>
          )}

          {!isStreaming && !isLoadingWebRTC && (
            <div className='player-component-wrapper player-loading-wrapper'>
              <p>Live stream is not loaded... Click to Start Streaming</p>
            </div>
          )}
        </div>
      </div>
      <div className='player-live-buttons-wrapper'>
        <Button onClick={startWebRTC} variant='default' disabled={isLoadingWebRTC || isStreaming}>
          Start Live Stream
        </Button>

        <Button variant='secondary' onClick={stopWebRTC}>
          Stop Live Stream
        </Button>
      </div>
    </React.Fragment>
  );
};
