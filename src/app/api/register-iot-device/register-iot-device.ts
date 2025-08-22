import { RegisterDeviceResponse } from '@/types/device-types';
import { GenericResponse } from '@/types/http-response';

export const registerIoTDevice = async (): Promise<GenericResponse<RegisterDeviceResponse>> => {
  try {
    const registerIoTDeviceResponse = await fetch(
      `${process.env.VIDEO_SERVICE_URL}/api/v1/device/register`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    const registerIoTDevice = await registerIoTDeviceResponse.json();
    return registerIoTDevice;
  } catch (e) {
    console.error('Error fetching device info:', e);
    return {
      status: 'Error',
      data: {} as RegisterDeviceResponse,
    };
  }
};
