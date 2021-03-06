import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { sandbox as sinonSandbox, SinonFakeTimers, SinonSandbox, SinonStub } from 'sinon';

import { Changes } from '../../index';
import { ApiResponse, StApi } from '../Api';
import { setUserSession } from '../Session/DataAccess';
import { setEnvironment } from '../Settings';
import { session as testSession } from '../TestData/UserInfoExpectedResults';
import ChangeWatcher from './ChangeWatcher';
import ChangeNotification = Changes.ChangeNotification;

chai.use(chaiAsPromised);

let sandbox: SinonSandbox;
let clock: SinonFakeTimers;
let changeWatcher: ChangeWatcher;
const TICK_INTERVAL = 5000;

describe('ChangeWatcher', () => {
	before(() => {
		setEnvironment({ stApiUrl: 'api', integratorApiKey: '987654321' });
	});

	beforeEach((done) => {
		sandbox = sinonSandbox.create();
		clock = sandbox.useFakeTimers((new Date()).getTime());
		setUserSession(testSession).then(() => { done(); });
	});

	afterEach((done) => {
		sandbox.restore();
		clock.restore();
		setUserSession(null).then(() => { done(); });
	});

	describe('#start', () => {
		it('should start changes watch and check for changes on api multiple times', (done) => {
			changeWatcher = new ChangeWatcher(TICK_INTERVAL, () => {});
			const stub: SinonStub = sandbox.stub(StApi, 'get').callsFake(() => {
				return(new Promise<ApiResponse>((resolve) => {
					resolve(new ApiResponse(200, {
						changes: ''
					}));
				}));
			});

			changeWatcher.start().then(() => {
				clock.tick(24000);
				clock.restore();
				setTimeout(() => {
					chai.expect(stub.callCount).to.be.equal(5);
					done();
				}, 100);
			});
		});

		it('should start changes watch and get initial changes', (done) => {
			changeWatcher = new ChangeWatcher(TICK_INTERVAL, (changeNotifications: ChangeNotification[]) => {
				chai.expect(changeNotifications).to.eql([{
					type: 'trip',
					id: 'xxx',
					change: 'updated',
					version: 1
				} as ChangeNotification, {
					type: 'favorite',
					id: 'yyy',
					change: 'deleted',
				} as ChangeNotification, {
					type: 'settings',
					id: null,
					change: 'updated',
				} as ChangeNotification]);
				done();
			});

			sandbox.stub(StApi, 'get').callsFake((): Promise<ApiResponse> => {
				return new Promise<ApiResponse>((resolve) => {
					resolve(new ApiResponse(200, {
						changes: [{
							type: 'trip',
							id: 'xxx',
							change: 'updated',
							version: 1
						}, {
							type: 'favorite',
							id: 'yyy',
							change: 'deleted'
						}, {
							type: 'settings',
							id: null,
							change: 'updated'
						}]
					}));
				});
			});
			changeWatcher.start();
		});
	});

	describe('#kill', () => {
		it('should stop changes watching', (done) => {
			changeWatcher = new ChangeWatcher(TICK_INTERVAL, () => {});
			const stub: SinonStub = sandbox.stub(StApi, 'get').callsFake((): Promise<ApiResponse> => {
				return new Promise<ApiResponse>((resolve) => {
					resolve(new ApiResponse(200, {
						changes: ''
					}));
				});
			});

			changeWatcher.start().then(() => {
				clock.tick(24000);
				changeWatcher.kill();
				clock.tick(10000);
				clock.restore();
				setTimeout(() => {
					chai.expect(stub.callCount).to.be.eq(5);
					done();
				}, 100);

			});
		});
	});
});
