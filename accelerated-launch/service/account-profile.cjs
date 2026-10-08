'use strict';
/** Consumer-supplied correspondence details, kept on the private account row.
 * These values are never report facts and do not verify identity or change an assessment. */

const { ServiceError } = require('./errors.cjs');

const FIELD_LIMITS = Object.freeze({
  full_name: 200,
  date_of_birth: 10,
  phone: 50,
  contact_email: 254,
  address_line1: 250,
  address_line2: 250,
  city: 120,
  region: 120,
  postal_code: 32,
  country: 80,
  previous_address: 500
});
const PROFILE_FIELDS = Object.freeze(Object.keys(FIELD_LIMITS));
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function requireAccount(state, actor) {
  if (!actor || typeof actor.account_id !== 'string' || !actor.account_id) {
    throw new ServiceError('AUTHENTICATION_REQUIRED');
  }
  const account = state.accounts.find((row) => row.account_id === actor.account_id);
  if (!account) throw new ServiceError('AUTHENTICATION_REQUIRED');
  return account;
}

function profileView(account) {
  const profile = {};
  for (const key of PROFILE_FIELDS) {
    profile[key] = account.profile && typeof account.profile[key] === 'string' ? account.profile[key] : '';
  }
  return profile;
}

function validBirthDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000-')) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value &&
    value <= new Date().toISOString().slice(0, 10);
}

function validatedPatch(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ServiceError('INVALID_REQUEST');
  const patch = {};
  for (const key of Object.keys(input)) {
    if (!Object.hasOwn(FIELD_LIMITS, key) || typeof input[key] !== 'string') {
      throw new ServiceError('INVALID_REQUEST');
    }
    const value = input[key].trim();
    if (value.length > FIELD_LIMITS[key] || /[\x00-\x1f\x7f]/.test(value)) {
      throw new ServiceError('INVALID_REQUEST');
    }
    if (key === 'date_of_birth' && value && !validBirthDate(value)) throw new ServiceError('INVALID_REQUEST');
    if (key === 'contact_email' && value && !EMAIL.test(value)) throw new ServiceError('INVALID_REQUEST');
    patch[key] = value;
  }
  return patch;
}

function getProfile(store, actor) {
  return profileView(requireAccount(store.state(), actor));
}

/** Omitted keys keep their saved values; a supplied empty string clears that field. */
function setProfile(store, actor, input) {
  requireAccount(store.state(), actor);
  const patch = validatedPatch(input);
  return store.update((state) => {
    const account = requireAccount(state, actor);
    account.profile = { ...profileView(account), ...patch };
    account.profile_updated_at = new Date().toISOString();
    return profileView(account);
  });
}

module.exports = { getProfile, setProfile, PROFILE_FIELDS, FIELD_LIMITS };
