import { stringify } from 'query-string';

import { ApiResponse, StApi } from '../Api';
import { mapToursApiResponseToTours } from './Mapper';
import { Tour } from './Tour';
import { ToursQuery } from './ToursQuery';

export async function getTours(toursQuery: ToursQuery): Promise<Tour[]> {
	const apiResponse: ApiResponse = await StApi.get('tours/viator?' + stringify({
			parent_place_id: toursQuery.parentPlaceId,
			page: toursQuery.page,
			sort_by: toursQuery.sortBy,
			sort_direction: toursQuery.sortDirection
		}));

	if (!apiResponse.data.hasOwnProperty('tours')) {
		throw new Error('Wrong API response');
	}

	return mapToursApiResponseToTours(apiResponse.data.tours);
}
