import { camelizeKeys } from 'humps';

import { Location } from '../Geo';
import { Bounds } from '../Geo/Bounds';
import { MainMedia, PlaceDetailMedia } from '../Media/Media';
import { ApiResponse } from '../Xhr/ApiResponse';
import { Place, Price } from './Place';
import { Description, PlaceDetail, Reference, Tag } from './PlaceDetail';

export const mapPlaceApiResponseToPlaces = (apiResponse: ApiResponse): Place[] => {
	return apiResponse.data.places.map((place) => {
		return mapPlace(place, null);
	});
};

export const mapPlaceDetailedApiResponseToPlace = (apiResponse: ApiResponse, photoSize): Place => {
	const place = apiResponse.data.place;
	const detail = mapPlaceDetail(place, photoSize);
	return mapPlace(place, detail);
};

const mapPlace = (place, detail: PlaceDetail) => {
	return {
		guid: place.guid,
		level: place.level,
		rating: place.rating,
		location: place.location as Location,
		quadkey: place.quadkey,
		name: place.name,
		nameSuffix: place.name_suffix,
		boundingBox: place.bounding_box as Bounds,
		perex: place.perex,
		url: place.url,
		thumbnailUrl: place.thumbnail_url,
		price: place.price as Price,
		marker: place.marker,
		categories: place.categories,
		parents: place.parent_guids,
		detail
	} as Place;
};

const mapPlaceDetail = (place, photoSize): PlaceDetail => {
	const tags: Tag[] = place.tags.map((tag) => (camelizeKeys(tag) as Tag));
	const description: Description = place.description ? camelizeKeys(place.description) as Description : null;
	const references: Reference[] = place.references.map((reference) => camelizeKeys(reference));
	return {
		tags,
		address: place.address,
		admission: place.admission,
		description,
		email: place.email,
		duration: place.duration,
		openingHours: place.opening_hours,
		phone: place.phone,
		media: mapMainMediaToMedia(camelizeKeys(place.main_media) as MainMedia, photoSize),
		references
	} as PlaceDetail;
};

export const mapMainMediaToMedia = (mainMedia: MainMedia, photoSize: string): PlaceDetailMedia => {
	const mappedMedia: PlaceDetailMedia = {
		square: null,
		videoPreview: null,
		portrait: null,
		landscape: null
	};
	if (mainMedia) {
		Object.keys(mainMedia.usage).forEach((key) => {
			const mediaGuid = mainMedia.usage[key];
			mappedMedia[key] = mainMedia.media.reduce((acc, item) => {
				if (item.guid === mediaGuid) {
					item.urlTemplate = item.urlTemplate.replace(/{size}/i, photoSize || this._defaultPhotoSize);
					return item;
				}
				return acc;
			}, null);
		});
	}

	return mappedMedia as PlaceDetailMedia;
};
