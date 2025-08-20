import {
  BatteryInfo,
  BatteryInfoResponse,
  ConnectionStatus,
  DeviceInfo,
  DeviceInfoResponse,
} from '@/types/device-types';

export type GetDeviceInfoResponse = {
  connectionStatus: ConnectionStatus;
  batteryLevel: string;
  cpuPercent: number;
  uptimeSeconds: number;
  batteryTemperature: string;
  batteryChargingStatus: string;
};

export const getDeviceInfo = async (token: string): Promise<GetDeviceInfoResponse> => {
  try {
    const deviceInfoPromise = fetch(
      `${process.env.VIDEO_SERVICE_URL}/api/v1/device/operation/health-check`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
        },
      },
    );

    const batteryInfoPromise = fetch(
      `${process.env.VIDEO_SERVICE_URL}/api/v1/battery/health-check`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
        },
      },
    );

    const [deviceInfoResponse, batteryInfoResponse] = await Promise.all([
      deviceInfoPromise,
      batteryInfoPromise,
    ]);

    if (!deviceInfoResponse.ok || !batteryInfoResponse.ok) {
      console.error('Failed to fetch device or battery information');
      return {
        connectionStatus: ConnectionStatus.Disconnected,
        cpuPercent: 0,
        uptimeSeconds: 0,
        batteryTemperature: '0',
        batteryChargingStatus: 'unknown',
        batteryLevel: '0',
      };
    }

    const deviceInfoResponseJson: DeviceInfoResponse = await deviceInfoResponse.json();
    const deviceInfo: DeviceInfo = deviceInfoResponseJson.data.health_check_info;
    const batteryInfoResponseJson: BatteryInfoResponse = await batteryInfoResponse.json();
    const batteryInfo: BatteryInfo = batteryInfoResponseJson.data.battery_info;

    return {
      connectionStatus: Boolean(deviceInfo.device_id)
        ? ConnectionStatus.Connected
        : ConnectionStatus.Disconnected,
      cpuPercent: deviceInfo.cpu_percent,
      uptimeSeconds: deviceInfo.uptime_seconds,
      batteryTemperature: batteryInfo.temperature,
      batteryChargingStatus: batteryInfo.charging_status,
      batteryLevel: batteryInfo.charge_level,
    };
  } catch (e) {
    console.error('Error fetching device info:', e);
    return {
      connectionStatus: ConnectionStatus.Disconnected,
      cpuPercent: 0,
      uptimeSeconds: 0,
      batteryTemperature: '0',
      batteryChargingStatus: 'unknown',
      batteryLevel: '0',
    };
  }
};
