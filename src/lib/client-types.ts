/**
 * A client is either a legal entity or a natural person, and the two are identified by
 * different fields. A legal entity carries a company name and a company number (juridinio asmens
 * kodas); a natural person carries an asmens kodas and — while trading under an individual-activity
 * certificate — that certificate's number. The VAT code (PVM mokėtojo kodas) applies to both, since
 * a natural person can be a VAT payer too. `client_type` is what decides which of those fields the
 * client form shows and which of them an invoice prints.
 */

/** The order is what the type select offers: a natural person first, a legal entity second. */
export const CLIENT_TYPES = ["person", "company"] as const;

export type ClientType = (typeof CLIENT_TYPES)[number];

/** A new client is a natural person unless the type is changed: that is the quickest to fill in. */
export const DEFAULT_CLIENT_TYPE: ClientType = "person";

/** i18n keys of the type labels, resolved inside the `clients` namespace. */
export const CLIENT_TYPE_LABEL_KEYS: Record<ClientType, string> = {
  company: "form.typeCompany",
  person: "form.typePerson",
};

/** The identity columns of a client, as stored in `clients`. */
export interface ClientCodes {
  client_type: string;
  company_code: string;
  personal_code: string;
  self_employment_id: string;
}

/** A stored field that only one of the two types carries. */
export type ClientTypeField = "company" | "company_code" | "personal_code" | "self_employment_id";

/** The fields a legal entity has and a natural person does not: its name and its company number. */
const COMPANY_FIELDS: ClientTypeField[] = ["company", "company_code"];
/** The fields a natural person has and a legal entity does not: their two identity codes. */
const PERSON_FIELDS: ClientTypeField[] = ["personal_code", "self_employment_id"];

/**
 * The fields a client of `type` must not keep, because they belong to the other type. An invoice
 * prints whatever its buyer carries, so a company name or company number left on a natural person
 * would be printed as one of their own.
 */
export function typeFieldsToClear(type: ClientType): ClientTypeField[] {
  return type === "person" ? [...COMPANY_FIELDS] : [...PERSON_FIELDS];
}

/**
 * The code a client is recognised by in a list: the company number of a legal entity, the
 * personal code of a natural person — and when a person has no personal code recorded, the
 * IV certificate number, because that is what their invoice carries instead.
 */
export function clientCode(client: ClientCodes): string {
  if (client.client_type !== "person") return client.company_code;
  return client.personal_code || client.self_employment_id;
}
