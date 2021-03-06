import { Place } from '../Places';
import { Waypoint } from '../Route';
import { UserSettings } from '../Session';

export enum TransportMode {
	CAR = 'car',
	PEDESTRIAN = 'pedestrian',
	PUBLIC_TRANSIT = 'public_transit',
	BIKE = 'bike',
	BUS = 'bus',
	TRAIN = 'train',
	BOAT = 'boat',
	PLANE = 'plane'
}

export const UNBREAKABLE_TRANSPORT_MODES = [
	TransportMode.PLANE,
	TransportMode.BUS,
	TransportMode.TRAIN,
	TransportMode.BOAT
];

export function isTransportMode(mode: string): boolean {
	if (!mode) {
		return false;
	}
	return !!TransportMode[mode.toUpperCase()];
}

export enum TransportAvoid {
	TOLLS = 'tolls',
	HIGHWAYS = 'highways',
	FERRIES = 'ferries',
	UNPAVED = 'unpaved'
}

export function isTransportAvoid(avoid: string): boolean {
	return !!TransportAvoid[avoid];
}

export enum TripConflictResolution {
	MERGED = 'merged',
	DUPLICATED = 'duplicated',
	IGNORED = 'ignored',
	OVERRIDDEN = 'overridden'
}

export function isTripConflictResolution(resolution: string): boolean {
	return !!TripConflictResolution[resolution];
}

export enum TripConflictClientResolution {
	SERVER  = 'server',
	LOCAL = 'local'
}

export function isTripConflictClientResolution(resolution: string): boolean {
	return !!TripConflictClientResolution[resolution];
}

export interface TripConflictInfo {
	lastUserName: string;
	localUpdatedAt: string;
	localVersion: number;
	remoteUpdatedAt: string;
	remoteVersion: number;
	tripName: string | null;
}

export type TripConflictHandler = (conflictInfo: TripConflictInfo, trip: Trip) => Promise<TripConflictClientResolution>;

export interface TripInfo {
	id: string;
	ownerId: string;
	privacyLevel: string;
	name: string | null;
	version: number;
	startsOn: string | null;
	updatedAt: string;
	isDeleted: boolean;
	endsOn: string | null;
	url: string;
	media: TripMedia;
	privileges: TripPrivileges;
}

export interface Trip extends TripInfo {
	days: Day[];
}

export interface TripCreateRequest {
	name: string | null;
	startsOn: string;
	days: Day[];
	privacyLevel: string;
	endsOn: string;
	isDeleted: boolean;
}

export interface TripMedia {
	square: {
		id: string;
		urlTemplate: string;
	} | null;
	landscape: {
		id: string;
		urlTemplate: string;
	} | null;
	portrait: {
		id: string;
		urlTemplate: string;
	} | null;
	videoPreview: {
		id: string;
		urlTemplate: string;
	} | null;
}

export interface Day {
	note: string | null;
	itinerary: ItineraryItem[];
	date: string | null;
}

export interface ItineraryItem {
	place: Place | null;
	placeId: string;
	startTime: number | null; // Number of seconds from midnight.
	duration: number | null; // Time in seconds planned to spend visiting place.
	note: string | null;
	isSticky: boolean | null; // https://confluence.sygic.com/display/STV/Sticky+Places+in+Itinerary
	isStickyFirstInDay: boolean | null;
	isStickyLastInDay?: boolean | null;
	transportFromPrevious: TransportSettings | null;
}

export interface ItineraryItemUserData {
	startTime: number | null;
	duration: number | null;
	note: string | null;
}

export interface TransportSettings {
	mode: TransportMode;
	avoid: TransportAvoid[];
	startTime: number | null; // Number of seconds from midnight.
	duration: number | null; // Time in seconds spent on the transport.
	note: string | null;
	waypoints: Waypoint[];
	routeId: string | null;
}

export interface TripPrivileges {
	edit: boolean;
	manage: boolean;
	delete: boolean;
}

export interface TripUpdateData {
	name?: string;
	startsOn?: string;
	privacyLevel?: string;
	isDeleted?: boolean;
}

export interface TripTemplate {
	id: number;
	description: string;
	duration: number | null;
	trip: Trip;
}

export interface TripEditor {
	addDaysToTrip(
		trip: Trip,
		appendCount: number,
		prependCount: number,
		userSettings: UserSettings | null
	): Trip;
	addDayToTrip(
		trip: Trip,
		dayIndex: number,
		userSettings: UserSettings | null
	): Trip;
	removeDay(trip: Trip, dayIndex: number, userSettings: UserSettings | null): Trip;
	swapDaysInTrip(
		trip: Trip,
		firstDayIndex: number,
		secondDayIndex: number,
		userSettings: UserSettings | null
	): Trip;
	addPlaceToDay(
		trip: Trip,
		place: Place,
		dayIndex: number,
		userSettings: UserSettings | null,
		positionInDay?: number // If not passed the place is added to the end
	): Trip;
	duplicatePlace(
		trip: Trip,
		dayIndex: number,
		placeIndex: number,
		resetTransport: boolean,
		userSettings: UserSettings | null
	): Trip;
	movePlaceInDay(
		trip: Trip,
		dayIndex: number,
		positionFrom: number,
		positionTo: number,
		userSettings: UserSettings | null
	): Trip;
	removePlacesFromDay(
		trip: Trip,
		dayIndex: number,
		positionsInDay: number[],
		userSettings: UserSettings | null
	): Trip;
	removeAllPlacesFromDay(
		tripToBeUpdated: Trip,
		dayIndex: number,
		userSettings: UserSettings | null
	): Trip;
	addOrReplaceOvernightPlace(
		trip: Trip,
		place: Place,
		dayIndex: number,
		userSettings: UserSettings | null
	): Trip;
	removePlaceFromDaysByPlaceId(
		trip: Trip,
		placeId: string,
		dayIndexes: number[],
		userSettings: UserSettings | null
	): Trip;
	setTransport(
		trip: Trip,
		dayIndex: number,
		itemIndex: number,
		settings: TransportSettings | null
	): Trip;
	updatePlaceUserData(
		trip: Trip,
		dayIndex: number,
		itemIndex: number,
		startTime: number | null,
		duration: number | null,
		note: string | null
	): Trip;
	updateDayNote(trip: Trip, dayIndex: number, note: string): Trip;
	smartAddPlaceToDay(
		trip: Trip,
		placeId: string,
		dayIndex: number,
		positionInDay?: number // If not passed automatic algorithm is used
	): Promise<Trip>;
	smartAddSequenceToDay(
		trip: Trip,
		dayIndex: number,
		placeIds: string[],
		transports?: (TransportSettings | null)[] | null,
		itemsUserData?: (ItineraryItemUserData | null)[] | null,
		positionInDay?: number // If not passed automatic algorithm is used
	): Promise<Trip>;
	createTrip(startDate: string, name: string, daysCount: number, placeId?: string): Promise<Trip>;
	setStartDate(trip: Trip, startDate: string): Trip;
}
