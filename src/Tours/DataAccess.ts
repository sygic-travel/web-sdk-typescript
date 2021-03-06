import { stringify } from 'query-string';

import { ApiResponse, StApi } from '../Api';
import { mapToursApiResponseToTours } from './Mapper';
import { Tour, ToursGetYourGuideQuery, ToursTagStats, ToursViatorQuery } from './Tour';

export async function getToursViator(toursQuery: ToursViatorQuery): Promise<Tour[]> {
	const query: any = {
		parent_place_id: toursQuery.parentPlaceId
	};

	if (toursQuery.page !== null) {
		query.page = toursQuery.page;
	}

	if (toursQuery.sortDirection !== null) {
		query.sort_direction = toursQuery.sortDirection;
	}

	if (toursQuery.sortBy !== null) {
		query.sort_by = toursQuery.sortBy;
	}

	const apiResponse: ApiResponse = await StApi.get('tours/viator?' + stringify(query));

	if (!apiResponse.data.hasOwnProperty('tours')) {
		throw new Error('Wrong API response');
	}

	return mapToursApiResponseToTours(apiResponse.data.tours);
}

export async function getGetYourGuideTagStats(toursQuery: ToursGetYourGuideQuery): Promise<ToursTagStats[]> {
	const query: any = buildGetYourGuideFilterQuery(toursQuery);

	const apiResponse: ApiResponse = await StApi.get('tours/get-your-guide/stats?' + stringify(query));

	if (!apiResponse.data.hasOwnProperty('tag_stats')) {
		throw new Error('Wrong API response');
	}

	return apiResponse.data.tag_stats;
}

export async function getToursGetYourGuide(toursQuery: ToursGetYourGuideQuery): Promise<Tour[]> {
	const query: any = buildGetYourGuideFilterQuery(toursQuery);
	if (toursQuery.sortDirection !== null) {
		query.sort_direction = toursQuery.sortDirection;
	}

	if (toursQuery.sortBy !== null) {
		query.sort_by = toursQuery.sortBy;
	}

	if (toursQuery.count !== null) {
		query.count = toursQuery.count;
	}

	const apiResponse: ApiResponse = await StApi.get('tours/get-your-guide?' + stringify(query));

	if (!apiResponse.data.hasOwnProperty('tours')) {
		throw new Error('Wrong API response');
	}

	return mapToursApiResponseToTours(apiResponse.data.tours);
}

function buildGetYourGuideFilterQuery(toursQuery: ToursGetYourGuideQuery): any {
	const query: any = {};

	if (toursQuery.query !== null) {
		query.query = toursQuery.query;
	}

	if (toursQuery.bounds !== null) {
		query.bounds = toursQuery.bounds.south + ','
			+ toursQuery.bounds.west + ','
			+ toursQuery.bounds.north + ','
			+ toursQuery.bounds.east;
	}

	if (toursQuery.parentPlaceId !== null) {
		query.parent_place_id = toursQuery.parentPlaceId;
	}

	if (toursQuery.page !== null) {
		query.page = toursQuery.page;
	}

	if (toursQuery.tags.length) {
		query.tags = toursQuery.tags.join(',');
	}

	if (toursQuery.durationMin !== null || toursQuery.durationMax !== null) {
		query.duration = (toursQuery.durationMin ? toursQuery.durationMin : '') + ':'
		+ (toursQuery.durationMax ? toursQuery.durationMax : '');
	}

	if (toursQuery.startDate !== null) {
		query.start_date = toursQuery.startDate;
	}

	if (toursQuery.endDate !== null) {
		query.end_date = toursQuery.endDate;
	}

	return query;
}
