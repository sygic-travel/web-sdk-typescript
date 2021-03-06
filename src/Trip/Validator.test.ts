import * as chai from 'chai';
import { TransportMode } from './Trip';
import * as Validator from './Validator';

describe('Validator', () => {
	describe('#validateTransportSettings', () => {
		it('should throw an error when invalid mode is passed', () => {
			chai.expect(() => Validator.validateTransportSettings({}))
				.to.throw(Error, 'Invalid transport mode undefined');
			chai.expect(() => Validator.validateTransportSettings({mode: 'nonSenseValue'}))
				.to.throw(Error, 'Invalid transport mode nonSenseValue');
		});
		it('should throw an error when invalid avoid is passed', () => {
			chai.expect(() => Validator.validateTransportSettings({mode: TransportMode.CAR}))
				.to.throw(Error, 'avoid must be an array');
			chai.expect(() => Validator.validateTransportSettings({mode: TransportMode.CAR, avoid: ['xxx']}))
				.to.throw(Error, 'Invalid avoid value xxx');
		});
		it('should throw an error when invalid startTime is passed', () => {
			chai.expect(() => Validator.validateTransportSettings({mode: TransportMode.CAR, avoid: []}))
				.to.throw(Error, 'Missing startTime');
			chai.expect(() => Validator.validateTransportSettings({mode: TransportMode.CAR, avoid: [], startTime: -1}))
				.to.throw(Error, 'Invalid startTime value -1');
			chai.expect(() => Validator.validateTransportSettings({mode: TransportMode.CAR, avoid: [], startTime: 1000000}))
				.to.throw(Error, 'Invalid startTime value 1000000');
		});
		it('should throw an error when invalid duration is passed', () => {
			const settings = {
				mode: TransportMode.CAR,
				type: 'fastest',
				avoid: [],
				startTime: 3600,
			};
			chai.expect(() => Validator.validateTransportSettings(settings))
				.to.throw(Error, 'Missing duration');
			chai.expect(() => Validator.validateTransportSettings({...settings, ...{duration: -1}}))
				.to.throw(Error, 'Invalid duration value -1');
		});
		it('should throw an error when invalid note is passed', () => {
			const settings = {
				mode: TransportMode.CAR,
				type: 'fastest',
				avoid: [],
				startTime: 3600,
				duration: 1800
			};
			chai.expect(() => Validator.validateTransportSettings(settings))
				.to.throw(Error, 'Missing note');
			chai.expect(() => Validator.validateTransportSettings({...settings, ...{note: 0}}))
				.to.throw(Error, 'Invalid note value 0');
		});
		it('should throw an error when invalid note is passed', () => {
			const settings = {
				mode: TransportMode.CAR,
				type: 'fastest',
				avoid: [],
				startTime: 3600,
				duration: 1800,
				note: '',
			};
			chai.expect(() => Validator.validateTransportSettings(settings))
				.to.throw(Error, 'waypoints must be an array');
			chai.expect(() => Validator.validateTransportSettings({...settings, ...{waypoints: [{x: 0}]}}))
				.to.throw(Error, 'Invalid waypoint value [object Object]');
			chai.expect(() => Validator.validateTransportSettings({...settings, ...{waypoints: [{lat: '', lng: 0}]}}))
				.to.throw(Error, 'Invalid waypoint value [object Object]');
		});
		it('should pass correct settings', () => {
			const settings = {
				mode: TransportMode.CAR,
				type: 'fastest',
				avoid: [],
				startTime: 3600,
				duration: 1800,
				note: '',
				waypoints: [{lat: 1, lng: 2}],
			};
			Validator.validateTransportSettings(settings);
		});
	});
});
