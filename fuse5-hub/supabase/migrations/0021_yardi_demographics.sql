-- ----------------------------------------------------------------------------
-- 0021_yardi_demographics
-- Aligns `resident_demographics` to the REAL Yardi / InSite "Tenant Demographics"
-- form used by a live Ontario social-housing provider (WoodGreen / InSite Yardi).
--
-- 0018 already gave us a Yardi-shaped demographics companion table. This migration
-- EXTENDS that same table with the remaining fields the real form carries, mapped
-- 1:1 to its sections (Occupant Details, Gender, Ethnicity & Cultural Diversity,
-- Immigration Status, Mental/Developmental Challenge, Language, General, Barriers
-- To Services, Accessibility, Supportive Services).
--
-- We REUSE existing 0018 columns wherever they already cover a form field instead
-- of duplicating them (see the field map below). Only genuinely new fields are
-- added here, all as NULLABLE columns so the table stays additive + idempotent
-- (safe to re-run) and so a Yardi feed can upsert partial rows.
--
-- DOB note: the real form stores Date of Birth and derives Age. We store
-- `date_of_birth` here (date), but the directory LIST view continues to render the
-- banded `age_band` (from 0018), never the raw DOB — the profile drawer derives a
-- read-only Age from DOB on the client.
--
-- FIELD MAP (Yardi form field -> resident_demographics column)
--   OCCUPANT DETAILS
--     Tenant Name                 -> residents.name (existing)
--     Date of Birth               -> date_of_birth            (NEW)
--     Age (derived)               -> derived from date_of_birth (no column; UI)
--     Phone #                     -> residents.phone (existing)
--     Occupant Type               -> occupant_type            (0018, reused)
--     Person with Disabilities    -> person_with_disabilities (NEW)
--     Relationship to Main Tenant -> relationship_to_main_tenant (NEW)
--     Emergency Contact           -> emergency_contact_phone (0018, reused)
--     Name of Contact             -> emergency_contact_name  (0018, reused)
--                                    + emergency_contact_relation (0018, reused)
--     Other Contact               -> other_contact           (NEW)
--     Name of Contact (2)         -> other_contact_name      (NEW)
--   GENDER
--     Gender                      -> gender                  (NEW)
--     Sexual Orientation          -> sexual_orientation      (NEW)
--   ETHNICITY & CULTURAL DIVERSITY
--     Ethnicity                   -> ethnicity               (NEW)
--     Indigenous Identity         -> indigenous_identity     (NEW)
--   IMMIGRATION STATUS
--     Newcomer                    -> newcomer                (NEW)
--     Status in Canada            -> status_in_canada        (NEW)
--   MENTAL/DEVELOPMENTAL CHALLENGE
--     Mental Illness              -> mental_illness          (NEW)
--     Dual Diagnosis              -> dual_diagnosis          (NEW)
--     Developmental               -> developmental           (NEW)
--     Details                     -> challenge_details       (NEW)
--   LANGUAGE
--     Barriers To Communication   -> barriers_to_communication (NEW)
--     Language Spoken             -> language_spoken         (NEW)
--     Correspondence Language     -> correspondence_language (NEW)
--     Language Details            -> language_details        (NEW)
--     (Primary language)          -> primary_language        (0018, reused)
--   GENERAL
--     Smoker                      -> smoker                  (NEW)
--     Oxygen                      -> oxygen                  (NEW)
--     Pets                        -> pets                    (NEW)
--     Tenant Insurance            -> tenant_insurance        (NEW)
--     Notes                       -> notes                   (0018, reused)
--   BARRIERS TO SERVICES
--     Vision Impaired             -> vision_impaired         (NEW)
--     Hearing Impaired            -> hearing_impaired        (NEW)
--   ACCESSIBILITY
--     Wheelchair                  -> wheelchair              (NEW)
--     Mobility Issues             -> mobility                (0018, reused)
--     Walker                      -> walker                  (NEW)
--     Scooter                     -> scooter                 (NEW)
--     Accessibility Requirements  -> accessibility_requirements (NEW)
--                                    + accessibility_needs[] (0018, reused tags)
--   SUPPORTIVE SERVICES
--     Supportive Services         -> supportive_services     (NEW)
--     Agency 1                    -> agency_1                (NEW) / support_agency (0018) is Agency 1 alias
--     Agency 2                    -> agency_2                (NEW)
--     Caseworker                  -> case_worker             (0018, reused)
-- ----------------------------------------------------------------------------

-- OCCUPANT DETAILS ----------------------------------------------------------
alter table resident_demographics add column if not exists date_of_birth date;                       -- raw DOB (list view still shows age_band only)
alter table resident_demographics add column if not exists person_with_disabilities text;            -- 'yes' | 'no' | 'unknown'
alter table resident_demographics add column if not exists relationship_to_main_tenant text;         -- 'Self' | 'Spouse' | 'Child' | 'Parent' | ...
alter table resident_demographics add column if not exists other_contact text;                       -- secondary contact phone
alter table resident_demographics add column if not exists other_contact_name text;                  -- secondary contact name

-- GENDER --------------------------------------------------------------------
alter table resident_demographics add column if not exists gender text;                              -- Woman/Man/Non-binary/Two-Spirit/...
alter table resident_demographics add column if not exists sexual_orientation text;                  -- Straight/Gay/Lesbian/Bisexual/...

-- ETHNICITY & CULTURAL DIVERSITY -------------------------------------------
alter table resident_demographics add column if not exists ethnicity text;
alter table resident_demographics add column if not exists indigenous_identity text;                 -- First Nations/Métis/Inuit/Not Indigenous/...

-- IMMIGRATION STATUS --------------------------------------------------------
alter table resident_demographics add column if not exists newcomer text;                            -- 'yes' | 'no' | 'unknown'
alter table resident_demographics add column if not exists status_in_canada text;                    -- Citizen/PR/Protected Person/Work Permit/...

-- MENTAL / DEVELOPMENTAL CHALLENGE -----------------------------------------
alter table resident_demographics add column if not exists mental_illness text;                      -- 'yes' | 'no' | 'unknown'
alter table resident_demographics add column if not exists dual_diagnosis text;                      -- 'yes' | 'no' | 'unknown'
alter table resident_demographics add column if not exists developmental text;                       -- 'yes' | 'no' | 'unknown'
alter table resident_demographics add column if not exists challenge_details text;                   -- free text

-- LANGUAGE ------------------------------------------------------------------
alter table resident_demographics add column if not exists barriers_to_communication text;           -- 'yes' | 'no' | 'unknown'
alter table resident_demographics add column if not exists language_spoken text;                     -- spoken language (may differ from primary_language)
alter table resident_demographics add column if not exists correspondence_language text;             -- language for written notices
alter table resident_demographics add column if not exists language_details text;                    -- free text

-- GENERAL -------------------------------------------------------------------
alter table resident_demographics add column if not exists smoker text;                              -- 'yes' | 'no' | 'unknown'
alter table resident_demographics add column if not exists oxygen text;                              -- 'yes' | 'no' | 'unknown' (in-home oxygen — fire-safety flag)
alter table resident_demographics add column if not exists pets text;                                -- 'yes' | 'no' | 'unknown'
alter table resident_demographics add column if not exists tenant_insurance text;                    -- 'yes' | 'no' | 'unknown'

-- BARRIERS TO SERVICES ------------------------------------------------------
alter table resident_demographics add column if not exists vision_impaired text;                     -- 'yes' | 'no' | 'unknown'
alter table resident_demographics add column if not exists hearing_impaired text;                    -- 'yes' | 'no' | 'unknown'

-- ACCESSIBILITY -------------------------------------------------------------
alter table resident_demographics add column if not exists wheelchair text;                          -- 'yes' | 'no' | 'unknown'
alter table resident_demographics add column if not exists walker text;                              -- 'yes' | 'no' | 'unknown'
alter table resident_demographics add column if not exists scooter text;                             -- 'yes' | 'no' | 'unknown'
alter table resident_demographics add column if not exists accessibility_requirements text;          -- free text (complements accessibility_needs[] tags)

-- SUPPORTIVE SERVICES -------------------------------------------------------
alter table resident_demographics add column if not exists supportive_services text;                 -- 'yes' | 'no' | 'unknown'
alter table resident_demographics add column if not exists agency_1 text;                            -- primary support agency (mirrors/extends support_agency)
alter table resident_demographics add column if not exists agency_2 text;                            -- secondary support agency
-- (caseworker reuses 0018 case_worker)

-- RLS is already enabled on resident_demographics by 0018 (org-scoped read via
-- f5_is_member, role-gated write via f5_has_role) and applies to all columns,
-- so no policy changes are needed for the new columns.
