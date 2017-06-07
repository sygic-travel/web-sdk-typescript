import { Dao as placesDao, getPlaceDetailed, getPlaceDetailedBatch, Place } from '../Places';
import * as Dao from './DataAccess';
import * as TripManipulator from './Manipulator';
import { putPlacesToTrip } from './Mapper';
import * as PositionFinder from './PositionFinder';
import {
	Day,
	isTransportAvoid,
	isTransportMode,
	isTransportType,
	ItineraryItem,
	TransportAvoid,
	TransportMode,
	TransportSettings,
	TransportType,
	Trip,
	TripMedia,
	TripPrivileges,
	TripUpdateData
} from './Trip';

export {
	Day,
	Dao,
	ItineraryItem,
	isTransportAvoid,
	isTransportMode,
	isTransportType,
	TransportAvoid,
	TransportMode,
	TransportSettings,
	TransportType,
	Trip,
	TripMedia,
	TripPrivileges,
	TripUpdateData
};

export async function getTrips(dateFrom: string, dateTo: string): Promise<Trip[]> {
	return await Dao.getTrips(dateTo, dateFrom);
}

export async function getTripDetailed(id: string): Promise<Trip> {
	const tripWithoutPlaces: Trip = await Dao.getTripDetailed(id);
	if (tripWithoutPlaces.days) {
		const placesGuids: string[] = getPlacesIdsFromTrip(tripWithoutPlaces);
		return putPlacesToTrip(tripWithoutPlaces, await getPlaceDetailedBatch(placesGuids, '300x300'));
	}
	return tripWithoutPlaces;
}

export function getPlacesIdsFromTrip(trip: Trip): string[] {
	if (!trip.days) {
		return [];
	}

	const initAcc: string[] = [];
	return trip.days.reduce((acc, day: Day): string[] => ([
		...acc,
		...day.itinerary.map((itineraryItem: ItineraryItem): string => (itineraryItem.placeId))
	]), initAcc);
}

export async function updateTrip(id: string, dataToUpdate: TripUpdateData): Promise<Trip> {
	const tripToBeUpdated: Trip = await getTripDetailed(id);

	if (dataToUpdate.name) {
		tripToBeUpdated.name = dataToUpdate.name;
	}

	if (dataToUpdate.startsOn) {
		tripToBeUpdated.startsOn = dataToUpdate.startsOn;
	}

	if (dataToUpdate.privacyLevel) {
		tripToBeUpdated.privacyLevel = dataToUpdate.privacyLevel;
	}

	return await Dao.updateTrip(tripToBeUpdated);
}

export async function addDayToTrip(id: string): Promise<Trip> {
	return Dao.updateTrip(TripManipulator.addDay(await getTripDetailed(id)));
}

export async function prependDayToTrip(id: string): Promise<Trip> {
	return Dao.updateTrip(TripManipulator.prependDayToTrip(await getTripDetailed(id)));
}

export async function removeDayFromTrip(id: string, dayIndex: number): Promise<Trip> {
	return Dao.updateTrip(TripManipulator.removeDayFromTrip(await getTripDetailed(id), dayIndex));
}

export async function swapDaysInTrip(id: string, firstDayIndex: number, secondDayIndex: number): Promise<Trip>  {
	return Dao.updateTrip(TripManipulator.swapDaysInTrip(await getTripDetailed(id), firstDayIndex, secondDayIndex));
}

export async function setTransport(
	tripId: string,
	dayIndex: number,
	itemIndex: number,
	settings: TransportSettings): Promise<Trip>  {
	return Dao.updateTrip(TripManipulator.setTransport(await getTripDetailed(tripId), dayIndex, itemIndex, settings));
}

export async function movePlaceInDay(
	id: string,
	dayIndex: number,
	positionFrom: number,
	positionTo: number): Promise<Trip> {
	return Dao.updateTrip(TripManipulator.movePlaceInDay(await getTripDetailed(id), dayIndex, positionFrom, positionTo));
}

export async function removePlaceFromDay(id: string, dayIndex: number, positionInDay: number): Promise<Trip> {
	return Dao.updateTrip(TripManipulator.removePlaceFromDay(await getTripDetailed(id), dayIndex, positionInDay));
}

export async function addPlaceToDay(
	tripId: string,
	placeId: string,
	dayIndex: number,
	positionInDay?: number): Promise<Trip> {
	const trip: Trip = await getTripDetailed(tripId);
	const place: Place = await getPlaceDetailed(placeId, '300x300');
	if (!positionInDay) {
		let day: Day;
		if (trip.days && trip.days[dayIndex]) {
			day = trip.days[dayIndex];
		} else {
			throw new Error('Trip does not have day on index ' + dayIndex);
		}
		positionInDay = PositionFinder.findOptimalPosition(place, await placesDao.getPlacesFromTripDay(day));
	}

	return Dao.updateTrip(TripManipulator.addPlaceToDay(
		await getTripDetailed(tripId),
		await getPlaceDetailed(placeId, '300x300'),
		dayIndex,
		positionInDay
	));
};
