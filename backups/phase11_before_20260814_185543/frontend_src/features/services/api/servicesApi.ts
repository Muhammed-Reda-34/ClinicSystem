import { http } from "../../../lib/http";
import type {
  DentalService,
  DentalServicePayload,
  PriceHistoryItem,
} from "../../../types/clinical";

export async function getDentalServices(
  includeInactive = false,
) {
  const response =
    await http.get<DentalService[]>(
      "/dental-services",
      {
        params: {
          includeInactive,
        },
      },
    );

  return response.data;
}

export async function createDentalService(
  payload: DentalServicePayload,
) {
  const response =
    await http.post<{
      serviceId: string;
    }>(
      "/dental-services",
      payload,
    );

  return response.data;
}

export async function updateDentalService(
  serviceId: string,
  payload: DentalServicePayload,
) {
  await http.put(
    `/dental-services/${serviceId}`,
    {
      ...payload,
      isActive:
        payload.isActive
        ?? true,
    },
  );
}

export async function getDentalServicePriceHistory(
  serviceId: string,
) {
  const response =
    await http.get<PriceHistoryItem[]>(
      `/dental-services/${serviceId}/price-history`,
    );

  return response.data;
}
