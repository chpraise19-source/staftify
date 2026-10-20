import {test} from 'node:test';
import assert from 'node:assert/strict';
import {shiftSchema,hoursBetween,estimatePay} from '../src/lib/domain';
const valid={title:'Registered Nurse',specialty:'RN',starts_at:'2030-01-01T07:00:00Z',ends_at:'2030-01-01T19:00:00Z',hourly_rate:52};
test('accepts an overnight shift and computes direct facility pay',()=>{assert.equal(shiftSchema.safeParse(valid).success,true);assert.equal(hoursBetween(valid.starts_at,valid.ends_at),12);assert.equal(estimatePay(valid.starts_at,valid.ends_at,52),624);});
test('rejects backward, overlong, past and invalid-rate shifts',()=>{for(const bad of [{...valid,ends_at:valid.starts_at},{...valid,ends_at:'2030-01-03T19:00:00Z'},{...valid,starts_at:'2020-01-01T00:00:00Z'},{...valid,hourly_rate:0},{...valid,specialty:'Doctor'}])assert.equal(shiftSchema.safeParse(bad).success,false);});
test('rounds fractional pay and cannot produce negative hours',()=>{assert.equal(estimatePay('2030-01-01T00:00:00Z','2030-01-01T01:01:00Z',31.25),31.77);assert.equal(hoursBetween(valid.ends_at,valid.starts_at),0);});
