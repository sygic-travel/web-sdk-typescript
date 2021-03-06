import { camelizeKeys } from 'humps';

import { AvailableHotels, Hotel, HotelsFilter } from '.';
import { ApiResponse, StApi } from '../Api';
import { mapPlace } from '../Places/Mapper';

export async function getHotels(filter: HotelsFilter): Promise<AvailableHotels> {
	if (filter.bounds && filter.zoom) {
		filter = filter.switchBoundsToMapTileBounds();
	}
	const apiResponse: ApiResponse = await StApi.get('hotels/list/?' + filter.toQueryString());
	if (!apiResponse.data.hasOwnProperty('hotels')) {
		throw new Error('Wrong API response');
	}
	const hotels = apiResponse.data.hotels.map((hotelData: any) => {
		return {
			place: mapPlace(hotelData.place, null),
			bookingCom: camelizeKeys(hotelData.booking_com)
		} as Hotel;
	});

	return {
		hotels,
		hotelFacilities: apiResponse.data.hotel_facilities,
		roomFacilities: apiResponse.data.room_facilities
	} as AvailableHotels;
}
