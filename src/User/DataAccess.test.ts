import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { SinonSandbox, SinonStub } from 'sinon';
import * as sinon from 'sinon';

import { Session, UserInfo, UserSettings } from '.';
import { ApiResponse, SsoApi, StApi } from '../Api';
import { userCache } from '../Cache';
import { setEnvironment } from '../Settings';
import { tokenData } from '../TestData/SsoApiResponses';
import { userInfo as userInfoApiResponse } from '../TestData/UserInfoApiResponse';
import { userInfo as userInfoResult } from '../TestData/UserInfoExpectedResults';
import * as Dao from './DataAccess';

let sandbox: SinonSandbox;
chai.use(chaiAsPromised);

describe('UserDataAccess', () => {
	before((done) => {
		setEnvironment({ stApiUrl: 'api', integratorApiKey: '987654321', ssoClientId: 'sso_client_id' });
		done();
	});

	beforeEach(() => {
		sandbox = sinon.sandbox.create();
	});

	afterEach(() => {
		sandbox.restore();
		userCache.reset();
	});

	const settingsApiData = {
		settings: {
			home_place_id: 'poi:1',
			work_place_id: 'poi:2'
		}
	};

	const settings: UserSettings = {
		homePlaceId: 'poi:1',
		workPlaceId: 'poi:2'
	};

	describe('#getUserSettings', () => {
		it('should get user settings from api if is not in cache', () => {
			const stub: SinonStub = sandbox.stub(StApi, 'get').returns(new Promise<ApiResponse>((resolve) => {
				resolve(new ApiResponse(200, settingsApiData));
			}));

			return Dao.getUserSettings().then((result) => {
				sinon.assert.calledOnce(stub);
				return chai.expect(result).to.deep.equal(settings);
			});
		});

		it('should get user settings response from cache if it is already in cache', async () => {
			const apiStub: SinonStub = sandbox.stub(StApi, 'get').returns(new Promise<ApiResponse>((resolve) => {
				resolve(new ApiResponse(200, settingsApiData));
			}));

			await userCache.set('settings', settingsApiData.settings);

			return Dao.getUserSettings().then((result) => {
				sinon.assert.notCalled(apiStub);
				return chai.expect(result).to.deep.equal(settings);
			});

		});
	});

	describe('#updateUserSettings', () => {
		it('should put updated settings in cache and call api', () => {
			const apiStub: SinonStub = sandbox.stub(StApi, 'put').returns(new Promise<ApiResponse>((resolve) => {
				resolve(new ApiResponse(200, settingsApiData));
			}));
			return Dao.updateUserSettings(settings).then(() => {
				chai.expect(userCache.get('settings'))
					.to.be.eventually.deep.equal(settingsApiData.settings);
				return chai.expect(apiStub.callCount).to.equal(1);
			});
		});
	});

	describe('#getSessionWithDeviceId', () => {
		it('should get the token from api', () => {
			const apiStub: SinonStub = sandbox.stub(SsoApi, 'post').returns(new Promise<ApiResponse>((resolve) => {
				resolve(new ApiResponse(200, tokenData));
			}));
			const testSession: Session = {
				accessToken: tokenData.access_token,
				refreshToken: tokenData.refresh_token
			};
			return Dao.getSessionWithDeviceId('id').then((data) => {
				chai.expect(data).to.deep.equal(testSession);
				chai.expect(apiStub.callCount).to.equal(1);
				chai.expect(apiStub.getCall(0).args[0]).to.equal('oauth2/token');
				chai.expect(apiStub.getCall(0).args[1]['device_code']).to.equal('id');
				chai.expect(apiStub.getCall(0).args[1]['device_platform']).to.be.undefined;
				chai.expect(apiStub.getCall(0).args[1]['grant_type']).to.equal('client_credentials');
			});
		});

		it('should call the api with optional parameters', () => {
			const apiStub: SinonStub = sandbox.stub(SsoApi, 'post').returns(new Promise<ApiResponse>((resolve) => {
				resolve(new ApiResponse(200, tokenData));
			}));
			return Dao.getSessionWithDeviceId('id', 'ios').then((data) => {
				chai.expect(apiStub.getCall(0).args[1]['device_platform']).to.equal('ios');
			});
		});
	});

	describe('#getSessionWithPassword', () => {
		it('should get the token from api', () => {
			const apiStub: SinonStub = sandbox.stub(SsoApi, 'post').returns(new Promise<ApiResponse>((resolve) => {
				resolve(new ApiResponse(200, tokenData));
			}));
			const testSession: Session = {
				accessToken: tokenData.access_token,
				refreshToken: tokenData.refresh_token
			};
			return Dao.getSessionWithPassword('name', 'pass').then((data) => {
				chai.expect(data).to.deep.equal(testSession);
				chai.expect(apiStub.callCount).to.equal(1);
				chai.expect(apiStub.getCall(0).args[0]).to.equal('oauth2/token');
				chai.expect(apiStub.getCall(0).args[1]['username']).to.equal('name');
				chai.expect(apiStub.getCall(0).args[1]['password']).to.equal('pass');
				chai.expect(apiStub.getCall(0).args[1]['device_code']).to.be.undefined;
				chai.expect(apiStub.getCall(0).args[1]['device_platform']).to.be.undefined;
				chai.expect(apiStub.getCall(0).args[1]['grant_type']).to.equal('password');
			});
		});

		it('should call the api with optional parameters', () => {
			const apiStub: SinonStub = sandbox.stub(SsoApi, 'post').returns(new Promise<ApiResponse>((resolve) => {
				resolve(new ApiResponse(200, tokenData));
			}));
			return Dao.getSessionWithPassword('name', 'pass', 'id', 'ios').then((data) => {
				chai.expect(apiStub.getCall(0).args[1]['device_code']).to.equal('id');
				chai.expect(apiStub.getCall(0).args[1]['device_platform']).to.equal('ios');
			});
		});
	});

	describe('#getSessionWithThirdPartyAuth', () => {
		it('should get the token from api by access token', () => {
			const apiStub: SinonStub = sandbox.stub(SsoApi, 'post').returns(new Promise<ApiResponse>((resolve) => {
				resolve(new ApiResponse(200, tokenData));
			}));
			const testSession: Session = {
				accessToken: tokenData.access_token,
				refreshToken: tokenData.refresh_token
			};
			return Dao.getSessionWithThirdPartyAuth('facebook', 'facebook_token', null).then((data) => {
				chai.expect(data).to.deep.equal(testSession);
				chai.expect(apiStub.callCount).to.equal(1);
				chai.expect(apiStub.getCall(0).args[0]).to.equal('oauth2/token');
				chai.expect(apiStub.getCall(0).args[1]['access_token']).to.equal('facebook_token');
				chai.expect(apiStub.getCall(0).args[1]['authorization_code']).to.be.undefined;
				chai.expect(apiStub.getCall(0).args[1]['device_code']).to.be.undefined;
				chai.expect(apiStub.getCall(0).args[1]['device_platform']).to.be.undefined;
				chai.expect(apiStub.getCall(0).args[1]['grant_type']).to.equal('facebook');
			});
		});

		it('should get the token from api by authorization code', () => {
			const apiStub: SinonStub = sandbox.stub(SsoApi, 'post').returns(new Promise<ApiResponse>((resolve) => {
				resolve(new ApiResponse(200, tokenData));
			}));
			const testSession: Session = {
				accessToken: tokenData.access_token,
				refreshToken: tokenData.refresh_token
			};
			return Dao.getSessionWithThirdPartyAuth('facebook', null, 'auth_code').then((data) => {
				chai.expect(data).to.deep.equal(testSession);
				chai.expect(apiStub.callCount).to.equal(1);
				chai.expect(apiStub.getCall(0).args[0]).to.equal('oauth2/token');
				chai.expect(apiStub.getCall(0).args[1]['access_token']).to.be.undefined;
				chai.expect(apiStub.getCall(0).args[1]['authorization_code']).to.equal('auth_code');
				chai.expect(apiStub.getCall(0).args[1]['device_code']).to.be.undefined;
				chai.expect(apiStub.getCall(0).args[1]['device_platform']).to.be.undefined;
				chai.expect(apiStub.getCall(0).args[1]['grant_type']).to.equal('facebook');
			});
		});

		it('should call the api with optional parameters', () => {
			const apiStub: SinonStub = sandbox.stub(SsoApi, 'post').returns(new Promise<ApiResponse>((resolve) => {
				resolve(new ApiResponse(200, tokenData));
			}));
			return Dao.getSessionWithThirdPartyAuth('facebook', null, 'auth_code', 'id', 'platform').then((data) => {
				chai.expect(apiStub.getCall(0).args[1]['device_code']).to.equal('id');
				chai.expect(apiStub.getCall(0).args[1]['device_platform']).to.equal('platform');
			});
		});

		it('should raise error on both token and code passed', (done) => {
			Dao.getSessionWithThirdPartyAuth('facebook', 'facebook_token', 'auth_code')
				.catch((e: Error) => {
					chai.expect(e.message).to.equal('Only one of accessToken, authorizationCode must be provided');
					done();
				});
		});
	});

	describe('#registerUser', () => {
		it('should call api properly', () => {
			const response = {id: '132456'};
			const apiStub: SinonStub = sandbox.stub(SsoApi, 'post');

			apiStub.withArgs('oauth2/token', { grant_type : 'client_credentials'})
				.returns(new Promise<ApiResponse>((resolve) => {
					resolve(new ApiResponse(200, tokenData));
				}));

			apiStub.withArgs('user/register', {})
				.returns(new Promise<ApiResponse>((resolve) => {
					resolve(new ApiResponse(200, response));
				}));

			return Dao.registerUser('email@example.com', '12345678', 'name').then((data) => {
				chai.expect(apiStub.callCount).to.equal(2);
				chai.expect(apiStub.getCall(0).args[0]).to.equal('oauth2/token');
				chai.expect(apiStub.getCall(0).args[1]['grant_type']).to.equal('client_credentials');
				chai.expect(apiStub.getCall(1).args[1]['username']).to.equal('email@example.com');
				chai.expect(apiStub.getCall(1).args[1]['email']).to.equal('email@example.com');
				chai.expect(apiStub.getCall(1).args[1]['password']).to.equal('12345678');
				chai.expect(apiStub.getCall(1).args[1]['name']).to.equal('name');
				chai.expect(apiStub.getCall(1).args[1]['email_is_verified']).to.be.false;
			});
		});
	});

	describe('#getUserInfo', () => {
		it('should call api and handle result for active session', async () => {
			await Dao.setUserSession({
				accessToken: '123',
				refreshToken: '321'
			});
			sandbox.stub(StApi, 'get').withArgs('user/info')
				.returns(new Promise<ApiResponse>((resolve) => {
					resolve(new ApiResponse(200, userInfoApiResponse));
				}));
			const userInfo: UserInfo|null = await Dao.getUserInfo();
			chai.expect(userInfo).deep.equal(userInfoResult);
		});
	});
});
