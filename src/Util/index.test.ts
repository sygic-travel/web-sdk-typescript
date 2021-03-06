import * as chai from 'chai';
import * as Util from '.';

describe('UtilController', () => {
	describe('#splitArrayToChunks', () => {
		it('should split array to chunks', () => {
			chai.expect(Util.splitArrayToChunks([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], 3)).to.deep.equal([
				[1, 2, 3], [4, 5, 6], [7, 8, 9], [10, 11]
			]);
			chai.expect(Util.splitArrayToChunks([1, 2], 3)).to.deep.equal([
				[1, 2]
			]);
		});
	});

	describe('#flatten', () => {
		it('should flatten array 1 level deep', () => {
			chai.expect(Util.flatten([[1, 2], [3, 4], [5, 6, 7]])).to.deep.equal([1, 2, 3, 4, 5, 6, 7]);
		});
	});

	describe('#addDaysToDate', () => {
		it('should correctly add days to date', () => {
			chai.expect(Util.addDaysToDate('2017-01-01', 2)).to.equal('2017-01-03');
			chai.expect(Util.addDaysToDate('2017-12-31', 1)).to.equal('2018-01-01');
			// Daylight saving time
			chai.expect(Util.addDaysToDate('2018-03-24', 2)).to.equal('2018-03-26');
		});
	});

	describe('#subtractDaysFromDate', () => {
		it('should correctly subtract days from date', () => {
			chai.expect(Util.subtractDaysFromDate('2017-01-03', 2)).to.equal('2017-01-01');
			chai.expect(Util.subtractDaysFromDate('2018-01-01', 1)).to.equal('2017-12-31');
			// Daylight saving time
			chai.expect(Util.subtractDaysFromDate('2018-10-29', 2)).to.equal('2018-10-27');
		});
	});

	describe('#Util.buildDateTimeWithSecondsFromMidnight', () => {
		it('should put date, time and timezone into one string', () => {
			chai.expect(Util.buildDateTimeWithSecondsFromMidnight('2018-01-01', 36000)).to.eq('2018-01-01T10:00:00');
			chai.expect(Util.buildDateTimeWithSecondsFromMidnight('2018-01-01', 7200)).to.eq('2018-01-01T02:00:00');
			chai.expect(Util.buildDateTimeWithSecondsFromMidnight('2018-01-01', 9)).to.eq('2018-01-01T00:00:09');
			chai.expect(Util.buildDateTimeWithSecondsFromMidnight('2018-01-01', 540)).to.eq('2018-01-01T00:09:00');
			chai.expect(Util.buildDateTimeWithSecondsFromMidnight('2018-01-01', 32400)).to.eq('2018-01-01T09:00:00');
		});
	});
});
