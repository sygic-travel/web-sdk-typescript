import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as dirtyChai from 'dirty-chai';
import { assert, sandbox as sinonSandbox, SinonFakeTimers, SinonSandbox, SinonStub } from 'sinon';

import { ApiResponse, StApi } from '../Api';
import { placesDetailedCache as Cache, tripsDetailedCache } from '../Cache';
import * as User from '../Session';
import { setEnvironment, setTripConflictHandler } from '../Settings';
import * as TripApiTestData from '../TestData/TripApiResponses';
import * as TripExpectedResults from '../TestData/TripExpectedResults';
import { cloneDeep } from '../Util';
import * as Dao from './DataAccess';
import {
	Day, ItineraryItem, Trip, TripConflictClientResolution, TripConflictHandler, TripConflictResolution,
	TripTemplate
} from './Trip';

let sandbox: SinonSandbox;
let clock: SinonFakeTimers;
chai.use(chaiAsPromised);
chai.use(dirtyChai);

describe('TripDataAccess', () => {
	before((done) => {
		setEnvironment({ stApiUrl: 'api', integratorApiKey: '987654321' });
		done();
	});

	beforeEach(() => {
		sandbox = sinonSandbox.create();
		sandbox.stub(User, 'getUserSettings').returns(new Promise<User.UserSettings>((resolve) => {
			resolve({homePlaceId: null, workPlaceId: null});
		}));
		clock = sandbox.useFakeTimers((new Date()).getTime());
		Cache.reset();
		tripsDetailedCache.reset();
	});

	afterEach(() => {
		clock.restore();
		sandbox.restore();
	});

	const trip1FromApi = cloneDeep(TripApiTestData.tripDetail.trip);
	trip1FromApi.id = '111';
	const trip1Expected: Trip = cloneDeep(TripExpectedResults.tripDetailed);
	trip1Expected.id = '111';

	if (trip1Expected.days) {
		trip1Expected.days = trip1Expected.days.map((day: Day) => {
			const newDay: Day = cloneDeep(day);
			newDay.itinerary = newDay.itinerary.map((itineraryItem: ItineraryItem) => {
				const newItineraryItem: ItineraryItem = cloneDeep(itineraryItem);
				delete newItineraryItem.place;
				return newItineraryItem;
			});
			return newDay;
		});
	}

	describe('#getTrips', () => {
		it('should just recallapi, compose parameter from and to and return trips', async () => {
			const apiStub = sandbox.stub(StApi, 'get').returns(new Promise<ApiResponse>((resolve) => {
				resolve(new ApiResponse(200, TripApiTestData.tripsList));
			}));

			const result: Trip[] = await Dao.getTrips();
			assert.calledOnce(apiStub);
			assert.calledWith(apiStub, 'trips/list?');
			chai.expect(result).to.deep.equal(TripExpectedResults.tripList);

			await Dao.getTrips(null, null);
			assert.calledWith(apiStub, 'trips/list?');

			await Dao.getTrips(null, '2017-01-01');
			assert.calledWith(apiStub, 'trips/list?to=2017-01-01');

			await Dao.getTrips('2017-01-01', null);
			assert.calledWith(apiStub, 'trips/list?from=2017-01-01');

			await Dao.getTrips('2017-01-01', '2017-12-01');
			assert.calledWith(apiStub, 'trips/list?from=2017-01-01&to=2017-12-01');
		});
	});

	describe('#getTripsInTrash', () => {
		it('should just recall api and return trips which are deleted', async () => {
			const apiStub = sandbox.stub(StApi, 'get').returns(new Promise<ApiResponse>((resolve) => {
				resolve(new ApiResponse(200, TripApiTestData.tripsList));
			}));

			const result: Trip[] = await Dao.getTripsInTrash();
			assert.calledOnce(apiStub);
			assert.calledWith(apiStub, 'trips/trash');
			chai.expect(result).to.deep.equal(TripExpectedResults.tripList);
		});
	});

	describe('#getTripDetailed', () => {
		it('should get trip response from api if is not in cache', () => {
			const stub: SinonStub = sandbox.stub(StApi, 'get').returns(new Promise<ApiResponse>((resolve) => {
				resolve(new ApiResponse(200, { trip: trip1FromApi }));
			}));

			return Dao.getTripDetailed('111').then((result) => {
				assert.calledOnce(stub);
				return chai.expect(result).to.deep.equal(trip1Expected);
			});
		});

		it('should get trip response from cache if it is already in cache', () => {
			const stub: SinonStub = sandbox.stub(StApi, 'get').returns(new Promise<ApiResponse>((resolve) => {
				resolve(new ApiResponse(200, {}));
			}));

			tripsDetailedCache.set('111', trip1FromApi);

			return Dao.getTripDetailed('111').then((result) => {
				assert.notCalled(stub);
				return chai.expect(result).to.deep.equal(trip1Expected);
			});

		});
	});

	describe('#updateTrip', () => {
		it('should put updated trip to cache', () => {
			Dao.updateTrip(TripExpectedResults.tripDetailed).then(() => {
				return chai.expect(tripsDetailedCache.get(TripExpectedResults.tripDetailed.id))
					.to.be.eventually.deep.equal(TripApiTestData.tripDetail.trip);
			});
		});

		it('should throw error when trying to save older version', async () => {
			const trip = cloneDeep(TripExpectedResults.tripDetailed);
			trip.version = 2;
			await Dao.updateTrip(trip);
			trip.version = 1;
			chai.expect(Dao.updateTrip(trip)).to.be.rejectedWith(Error, 'Trying to overwrite newer version.');
		});

		it('should call put on api and save response to cache', (done) => {
			const apiResponseTrip = cloneDeep(TripApiTestData.tripDetail.trip);
			apiResponseTrip.name = 'API TRIP';
			const apiPut: SinonStub = sandbox.stub(StApi, 'put').returns(new Promise<ApiResponse>((resolve) => {
				resolve(new ApiResponse(200, { trip: apiResponseTrip }));
			}));
			Dao.updateTrip(TripExpectedResults.tripDetailed).then(async () => {
				chai.expect(tripsDetailedCache.get(TripExpectedResults.tripDetailed.id))
					.to.be.eventually.deep.equal(TripApiTestData.tripDetail.trip);
				clock.tick(Dao.UPDATE_TIMEOUT + 100);
				chai.expect(apiPut.callCount).to.be.equal(1);
				clock.restore();
				// Wait for the trip be stored to cache before making further assertions
				setTimeout(() => {
					chai.expect(tripsDetailedCache.get(TripExpectedResults.tripDetailed.id))
					.to.be.eventually.deep.equal(apiResponseTrip);
					done();
				}, 100);
			});
		});

		it('should call put on api with actual updated_at', () => {
			const testUpdatedAt = new Date();
			clock.tick(1000);
			const apiResponseTrip = cloneDeep(TripApiTestData.tripDetail.trip);
			const apiPut: SinonStub = sandbox.stub(StApi, 'put').returns(new Promise<ApiResponse>((resolve) => {
				resolve(new ApiResponse(200, { trip: apiResponseTrip }));
			}));
			Dao.updateTrip(TripExpectedResults.tripDetailed).then(async () => {
				clock.tick(Dao.UPDATE_TIMEOUT + 100);
				const callDate = new Date(apiPut.getCall(0).args[1].updated_at);
				chai.expect(callDate > testUpdatedAt).to.be.true('Expect true');
				testUpdatedAt.setSeconds(testUpdatedAt.getSeconds() + 1);
				chai.expect(callDate < testUpdatedAt).to.be.true('Expect true');
			});
		});

		it('should call notificationHandler after PUT', (done) => {
			const handlerStub = sandbox.stub();
			Dao.setTripUpdatedNotificationHandler(handlerStub);
			const apiResponseTrip = cloneDeep(TripApiTestData.tripDetail.trip);
			sandbox.stub(StApi, 'put').returns(new Promise<ApiResponse>((resolve) => {
				resolve(new ApiResponse(200, { trip: apiResponseTrip }));
			}));
			Dao.updateTrip(TripExpectedResults.tripDetailed).then(async () => {
				clock.tick(Dao.UPDATE_TIMEOUT + 100);
				clock.restore();
				// Wait for the trip response to be handled before making further assertions
				setTimeout(() => {
					chai.expect(handlerStub.callCount).to.equal(1);
					chai.expect(handlerStub.getCall(0).args[0][0].change).to.equal('updated');
					chai.expect(handlerStub.getCall(0).args[0][0].type).to.equal('trip');
					chai.expect(handlerStub.getCall(0).args[0][0].version).to.equal(TripExpectedResults.tripDetailed.version);
					chai.expect(handlerStub.getCall(0).args[0][0].id).to.equal(TripExpectedResults.tripDetailed.id);
					done();
				}, 100);
			});
		});

		it('should call put on api after timeout', () => {
			const apiResponseTrip = cloneDeep(TripApiTestData.tripDetail.trip);
			apiResponseTrip.name = 'API TRIP';
			const apiPut: SinonStub = sandbox.stub(StApi, 'put').returns(new Promise<ApiResponse>((resolve) => {
				resolve(new ApiResponse(200, { trip: apiResponseTrip }));
			}));
			Dao.updateTrip(TripExpectedResults.tripDetailed).then(async () => {
				chai.expect(tripsDetailedCache.get(TripExpectedResults.tripDetailed.id))
					.to.be.eventually.deep.equal(TripApiTestData.tripDetail.trip);
				clock.tick(Dao.UPDATE_TIMEOUT - 1000);
				chai.expect(apiPut.callCount).to.be.equal(0);
				clock.tick(1100);
				chai.expect(apiPut.callCount).to.be.equal(1);
			});
		});

		it('should call api only once for consequent updates within timeout', () => {
			const apiResponseTrip = cloneDeep(TripApiTestData.tripDetail.trip);
			apiResponseTrip.name = 'API TRIP';
			const apiPut: SinonStub = sandbox.stub(StApi, 'put').returns(new Promise<ApiResponse>((resolve) => {
				resolve(new ApiResponse(200, { trip: apiResponseTrip }));
			}));
			Dao.updateTrip(TripExpectedResults.tripDetailed).then(async () => {
				chai.expect(tripsDetailedCache.get(TripExpectedResults.tripDetailed.id))
					.to.be.eventually.deep.equal(TripApiTestData.tripDetail.trip);
				clock.tick(Dao.UPDATE_TIMEOUT - 1000);
				chai.expect(apiPut.callCount).to.be.equal(0);
				Dao.updateTrip(TripExpectedResults.tripDetailed).then(() => {
					clock.tick(Dao.UPDATE_TIMEOUT + - 1000);
					chai.expect(apiPut.callCount).to.be.equal(0);
					clock.tick(1010);
					chai.expect(apiPut.callCount).to.be.equal(1);
				});
			});
		});

		it('should call conflict handler on IGNORED conflict and leave SERVER response', (done) => {
			let handlerCalled = false;
			const handler: TripConflictHandler =
				async (info, trip): Promise<TripConflictClientResolution.SERVER | TripConflictClientResolution.LOCAL> => {
					handlerCalled = true;
					return TripConflictClientResolution.SERVER;
			};
			setTripConflictHandler(handler);
			const apiPut: SinonStub = sandbox.stub(StApi, 'put').returns(new Promise<ApiResponse>((resolve) => {
				resolve(new ApiResponse(200, {
					trip: TripApiTestData.tripDetail.trip,
					conflict_resolution: TripConflictResolution.IGNORED,
					conflict_info: {
						last_user_name: 'Lojza',
						last_updated_at: '2017-10-10T10:10:10+02:00'
					}
				}));
			}));

			Dao.updateTrip(TripExpectedResults.tripDetailed).then(async () => {
				clock.tick(Dao.UPDATE_TIMEOUT + 10);
				clock.restore();
				// Wait for the trip be stored to cache before making further assertions
				setTimeout(() => {
					chai.expect(handlerCalled).to.be.true('Expect true');
					chai.expect(tripsDetailedCache.get(TripExpectedResults.tripDetailed.id))
						.to.be.eventually.deep.equal(TripApiTestData.tripDetail.trip);
					chai.expect(apiPut.callCount).to.be.equal(1);
					done();
				}, 100);
			});
		});

		it('should call update with newer updated_at when user select LOCAL changes', (done) => {
			let handlerCalled = false;
			const handler: TripConflictHandler =
				async (info, trip): Promise<TripConflictClientResolution.SERVER | TripConflictClientResolution.LOCAL> => {
					handlerCalled = true;
					return TripConflictClientResolution.LOCAL;
			};
			setTripConflictHandler(handler);
			const apiPut: SinonStub = sandbox.stub(StApi, 'put').returns(new Promise<ApiResponse>((resolve) => {
				resolve(new ApiResponse(200, {
					trip: TripApiTestData.tripDetail.trip,
					conflict_resolution: TripConflictResolution.IGNORED,
					conflict_info: {
						last_user_name: 'Lojza',
						last_updated_at: '2017-10-10T10:10:10+02:00'
					}
				}));
			}));

			Dao.updateTrip(TripExpectedResults.tripDetailed).then(async () => {
				clock.tick(Dao.UPDATE_TIMEOUT + 10);
				clock.restore();
				// Wait for the trip response to be handled before making further assertions
				setTimeout(() => {
					chai.expect(handlerCalled).to.be.true('Expect true');
					chai.expect(apiPut.callCount).to.be.equal(2);
					done();
				}, 100);
			});
		});
	});

	describe('#updateOlderCachedTrip', () => {
		it('should get updated trip from api and set it in cache and return true', async () => {
			const tripInCache = cloneDeep(trip1FromApi);
			const tripFromApi = cloneDeep(trip1FromApi);
			tripFromApi.name = 'x';
			tripsDetailedCache.set(tripInCache.id, tripInCache);

			sandbox.stub(StApi, 'get').returns(new Promise<ApiResponse>((resolve) => {
				resolve(new ApiResponse(200, { trip: tripFromApi }));
			}));

			const result = await Dao.updateOlderCachedTrip(tripInCache.id, 34);
			const tripToBeUpdated = await tripsDetailedCache.get(tripInCache.id);
			chai.expect(tripToBeUpdated.name).to.equal(tripFromApi.name);
			chai.expect(result).to.be.true('Expect true');
		});

		it('should not call api for trip which is already up to date and return should return false', async () => {
			const tripInCache = cloneDeep(trip1FromApi);
			await tripsDetailedCache.set(tripInCache.id, tripInCache);
			const apiStub = sandbox.stub(StApi, 'get');

			const result = await Dao.updateOlderCachedTrip(tripInCache.id, 32);
			chai.expect(apiStub.callCount).to.equal(0);
			chai.expect(result).to.be.false('Expect true');
		});

		it('should not call api when trip is not in cache and should return true', async () => {
			const apiStub = sandbox.stub(StApi, 'get').returns(new Promise<ApiResponse>((resolve) => {
				resolve(new ApiResponse(200, {}));
			}));

			const result = await Dao.updateOlderCachedTrip('unknownId', 1);
			chai.expect(apiStub.callCount).to.equal(0);
			chai.expect(result).to.be.true('Expect true');
		});
	});

	describe('#deleteTripFromCache', () => {
		it('should delete trip from cache', async () => {
			const tripInCache = cloneDeep(trip1FromApi);
			await tripsDetailedCache.set(tripInCache.id, tripInCache);
			chai.expect(tripsDetailedCache.get(tripInCache.id)).to.eventually.deep.equal(tripInCache);
			await Dao.deleteTripFromCache(tripInCache.id);
			chai.expect(tripsDetailedCache.get(tripInCache.id)).to.eventually.equal(null);
		});
	});

	describe('#emptyTripsTrash', () => {
		it('should empty trips trash', () => {
			const apiStub: SinonStub = sandbox.stub(StApi, 'delete_').returns(new Promise<ApiResponse>((resolve) => {
				resolve(new ApiResponse(200, {
					deleted_trip_ids: ['poi:1', 'poi:2', 'poi:3']
				}));
			}));
			chai.expect(Dao.emptyTripsTrash()).to.eventually.deep.equal(['poi:1', 'poi:2', 'poi:3']);
			chai.expect(apiStub.getCall(0).args[0]).equal('trips/trash');
		});
	});

	describe('#getTripTemplates', () => {
		it('should get trip templates', async () => {
			sandbox.stub(StApi, 'get').returns(new Promise<ApiResponse>((resolve) => {
				resolve(new ApiResponse(200, {
					trip_templates: [{
						id: 1234,
						description: 'test',
						duration: 123456,
						trip: trip1FromApi
					}]
				}));
			}));

			const tripTemplate: TripTemplate[] = await Dao.getTripTemplates('city:1');
			chai.expect(tripTemplate[0]).to.deep.equal({
				id: 1234,
				description: 'test',
				duration: 123456,
				trip: trip1Expected
			});
		});
	});

	describe('#applyTripTemplate', () => {
		it('should apply a trip template (recall api) and return trip', async () => {
			sandbox.stub(StApi, 'put').returns(new Promise<ApiResponse>((resolve) => {
				resolve(new ApiResponse(200, {
					trip: cloneDeep(trip1FromApi)
				}));
			}));

			const expectedTrip: Trip = cloneDeep(trip1Expected);
			const resultTrip: Trip = await Dao.applyTripTemplate('111', 123, 1);
			const tripFromCache: any = await tripsDetailedCache.get('111');

			chai.expect(tripFromCache).to.deep.equal(cloneDeep(trip1FromApi));
			chai.expect(resultTrip).to.deep.equal(expectedTrip);
		});
	});
});
