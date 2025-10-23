--
-- PostgreSQL database dump
--

\restrict nOdMsCgV4uiRLsHmBK3Rx2mi4cpjtuUpQfFNzHxTylEQKqk01h4kTFlPI4obyWP

-- Dumped from database version 14.19 (Homebrew)
-- Dumped by pg_dump version 14.19 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: regenerate_case_payload(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.regenerate_case_payload(case_uuid uuid) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
    result JSONB;
    case_record RECORD;
    plaintiffs JSONB;
    defendants JSONB;
BEGIN
    -- Get case information
    SELECT * INTO case_record FROM cases WHERE id = case_uuid;

    -- Build plaintiffs array with discovery data
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', p.id,
            'Name', jsonb_build_object(
                'First', p.first_name,
                'Last', p.last_name,
                'FirstAndLast', p.full_name
            ),
            'Type', p.plaintiff_type,
            'AgeCategory', p.age_category,
            'HeadOfHousehold', p.is_head_of_household,
            'UnitNumber', p.unit_number,
            'Discovery', (
                SELECT jsonb_build_object(
                    'Vermin', COALESCE((
                        SELECT jsonb_agg(io.option_code)
                        FROM party_issue_selections pis
                        JOIN issue_options io ON pis.issue_option_id = io.id
                        JOIN issue_categories ic ON io.category_id = ic.id
                        WHERE pis.party_id = p.id AND ic.category_code = 'vermin'
                    ), '[]'::jsonb),
                    'Insects', COALESCE((
                        SELECT jsonb_agg(io.option_code)
                        FROM party_issue_selections pis
                        JOIN issue_options io ON pis.issue_option_id = io.id
                        JOIN issue_categories ic ON io.category_id = ic.id
                        WHERE pis.party_id = p.id AND ic.category_code = 'insects'
                    ), '[]'::jsonb),
                    'Environmental', COALESCE((
                        SELECT jsonb_agg(io.option_code)
                        FROM party_issue_selections pis
                        JOIN issue_options io ON pis.issue_option_id = io.id
                        JOIN issue_categories ic ON io.category_id = ic.id
                        WHERE pis.party_id = p.id AND ic.category_code = 'environmental'
                    ), '[]'::jsonb),
                    'HasReceivedNotice', COALESCE(dd.has_received_notice, false),
                    'HasFiledComplaint', COALESCE(dd.has_filed_complaint, false)
                )
                FROM discovery_details dd
                WHERE dd.party_id = p.id
            )
        ) ORDER BY p.party_number
    ) INTO plaintiffs
    FROM parties p
    WHERE p.case_id = case_uuid AND p.party_type = 'plaintiff';

    -- Build defendants array
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', d.id,
            'Name', jsonb_build_object(
                'First', d.first_name,
                'Last', d.last_name,
                'FirstAndLast', d.full_name
            ),
            'EntityType', d.entity_type,
            'Role', d.role
        ) ORDER BY d.party_number
    ) INTO defendants
    FROM parties d
    WHERE d.case_id = case_uuid AND d.party_type = 'defendant';

    -- Build complete result
    result := jsonb_build_object(
        'Id', case_record.id,
        'InternalName', case_record.internal_name,
        'Name', case_record.form_name,
        'PlaintiffDetails', COALESCE(plaintiffs, '[]'::jsonb),
        'DefendantDetails2', COALESCE(defendants, '[]'::jsonb),
        'Full_Address', jsonb_build_object(
            'Country', 'US',
            'State_Province', jsonb_build_object(
                'Name', case_record.state,
                'City', jsonb_build_object(
                    'Name', case_record.city,
                    'PostalCode', jsonb_build_object(
                        'Name', case_record.zip_code
                    )
                )
            ),
            'StreetAddress', case_record.property_address
        ),
        'FilingLocation', case_record.filing_location
    );

    RETURN result;
END;
$$;


--
-- Name: FUNCTION regenerate_case_payload(case_uuid uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.regenerate_case_payload(case_uuid uuid) IS 'Regenerates the latest_payload JSONB from normalized relational data';


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: cases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    internal_name character varying(255),
    form_name character varying(255),
    property_address text NOT NULL,
    city character varying(255) NOT NULL,
    state character varying(2) NOT NULL,
    zip_code character varying(10) NOT NULL,
    county character varying(255),
    filing_location character varying(255),
    raw_payload jsonb NOT NULL,
    latest_payload jsonb,
    is_active boolean DEFAULT true,
    submitter_name character varying(255),
    submitter_email character varying(255),
    CONSTRAINT cases_state_check CHECK ((length((state)::text) = 2))
);


--
-- Name: TABLE cases; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.cases IS 'Stores main case/submission information from the legal form application';


--
-- Name: COLUMN cases.raw_payload; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cases.raw_payload IS 'Original form submission JSON, immutable record';


--
-- Name: COLUMN cases.latest_payload; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cases.latest_payload IS 'Regenerated JSON from normalized data, represents current editable state';


--
-- Name: discovery_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.discovery_details (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    party_id uuid NOT NULL,
    has_received_notice boolean DEFAULT false,
    notice_date date,
    notice_type character varying(255),
    has_filed_complaint boolean DEFAULT false,
    complaint_date date,
    complaint_agency character varying(255),
    has_repair_request boolean DEFAULT false,
    repair_request_date date,
    has_documentation boolean DEFAULT false,
    documentation_types text[],
    additional_notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE discovery_details; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.discovery_details IS 'Stores additional discovery information per plaintiff';


--
-- Name: issue_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.issue_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_code character varying(50) NOT NULL,
    category_name character varying(255) NOT NULL,
    display_order integer,
    is_multi_select boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true
);


--
-- Name: TABLE issue_categories; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.issue_categories IS 'Stores the main issue categories (Vermin, Insects, Safety, etc.)';


--
-- Name: issue_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.issue_options (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_id uuid NOT NULL,
    option_code character varying(50) NOT NULL,
    option_name character varying(255) NOT NULL,
    display_order integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true
);


--
-- Name: TABLE issue_options; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.issue_options IS 'Stores individual issue options within categories';


--
-- Name: parties; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.parties (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    case_id uuid NOT NULL,
    party_type character varying(20) NOT NULL,
    party_number integer NOT NULL,
    first_name character varying(255),
    last_name character varying(255),
    full_name character varying(511),
    plaintiff_type character varying(50),
    age_category character varying(50),
    is_head_of_household boolean DEFAULT false,
    unit_number character varying(50),
    entity_type character varying(50),
    role character varying(50),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT parties_names_check CHECK (((((party_type)::text = 'plaintiff'::text) AND (first_name IS NOT NULL) AND (last_name IS NOT NULL)) OR (((party_type)::text = 'defendant'::text) AND ((first_name IS NOT NULL) OR (last_name IS NOT NULL))))),
    CONSTRAINT parties_party_type_check CHECK (((party_type)::text = ANY ((ARRAY['plaintiff'::character varying, 'defendant'::character varying])::text[])))
);


--
-- Name: TABLE parties; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.parties IS 'Stores both plaintiffs and defendants for each case';


--
-- Name: COLUMN parties.party_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.parties.party_number IS 'Order in the form (plaintiff-1, plaintiff-2, etc.)';


--
-- Name: COLUMN parties.is_head_of_household; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.parties.is_head_of_household IS 'Only one HoH allowed per unit per case (enforced by partial unique index)';


--
-- Name: party_issue_selections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.party_issue_selections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    party_id uuid NOT NULL,
    issue_option_id uuid NOT NULL,
    selected_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    notes text
);


--
-- Name: TABLE party_issue_selections; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.party_issue_selections IS 'Links parties (plaintiffs) to their selected issues';


--
-- Name: v_cases_complete; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_cases_complete AS
SELECT
    NULL::uuid AS case_id,
    NULL::timestamp with time zone AS created_at,
    NULL::text AS property_address,
    NULL::character varying(255) AS city,
    NULL::character varying(2) AS state,
    NULL::character varying(10) AS zip_code,
    NULL::character varying(255) AS filing_location,
    NULL::bigint AS plaintiff_count,
    NULL::bigint AS defendant_count,
    NULL::jsonb AS latest_payload;


--
-- Name: v_plaintiff_issues; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_plaintiff_issues AS
 SELECT p.id AS party_id,
    p.case_id,
    p.full_name AS plaintiff_name,
    ic.category_name,
    io.option_name AS issue,
    pis.selected_at
   FROM (((public.parties p
     JOIN public.party_issue_selections pis ON ((p.id = pis.party_id)))
     JOIN public.issue_options io ON ((pis.issue_option_id = io.id)))
     JOIN public.issue_categories ic ON ((io.category_id = ic.id)))
  WHERE ((p.party_type)::text = 'plaintiff'::text)
  ORDER BY p.case_id, p.party_number, ic.display_order, io.display_order;


--
-- Name: cases cases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cases
    ADD CONSTRAINT cases_pkey PRIMARY KEY (id);


--
-- Name: discovery_details discovery_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discovery_details
    ADD CONSTRAINT discovery_details_pkey PRIMARY KEY (id);


--
-- Name: discovery_details discovery_party_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discovery_details
    ADD CONSTRAINT discovery_party_unique UNIQUE (party_id);


--
-- Name: issue_categories issue_categories_category_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issue_categories
    ADD CONSTRAINT issue_categories_category_code_key UNIQUE (category_code);


--
-- Name: issue_categories issue_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issue_categories
    ADD CONSTRAINT issue_categories_pkey PRIMARY KEY (id);


--
-- Name: issue_options issue_options_category_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issue_options
    ADD CONSTRAINT issue_options_category_code_unique UNIQUE (category_id, option_code);


--
-- Name: issue_options issue_options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issue_options
    ADD CONSTRAINT issue_options_pkey PRIMARY KEY (id);


--
-- Name: parties parties_case_party_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parties
    ADD CONSTRAINT parties_case_party_number_unique UNIQUE (case_id, party_type, party_number);


--
-- Name: parties parties_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parties
    ADD CONSTRAINT parties_pkey PRIMARY KEY (id);


--
-- Name: party_issue_selections party_issue_selections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.party_issue_selections
    ADD CONSTRAINT party_issue_selections_pkey PRIMARY KEY (id);


--
-- Name: party_issue_selections party_issue_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.party_issue_selections
    ADD CONSTRAINT party_issue_unique UNIQUE (party_id, issue_option_id);


--
-- Name: idx_cases_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cases_active ON public.cases USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_cases_city_state; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cases_city_state ON public.cases USING btree (city, state);


--
-- Name: idx_cases_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cases_created_at ON public.cases USING btree (created_at DESC);


--
-- Name: idx_cases_property_address; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cases_property_address ON public.cases USING btree (property_address);


--
-- Name: idx_discovery_party; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discovery_party ON public.discovery_details USING btree (party_id);


--
-- Name: idx_one_hoh_per_unit; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_one_hoh_per_unit ON public.parties USING btree (case_id, unit_number) WHERE ((is_head_of_household = true) AND (unit_number IS NOT NULL));


--
-- Name: INDEX idx_one_hoh_per_unit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_one_hoh_per_unit IS 'Enforces business rule: only one Head of Household per unit per case';


--
-- Name: idx_parties_case_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_parties_case_id ON public.parties USING btree (case_id);


--
-- Name: idx_parties_full_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_parties_full_name ON public.parties USING btree (full_name);


--
-- Name: idx_parties_hoh; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_parties_hoh ON public.parties USING btree (is_head_of_household) WHERE (is_head_of_household = true);


--
-- Name: idx_parties_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_parties_type ON public.parties USING btree (party_type);


--
-- Name: idx_party_issues_option; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_party_issues_option ON public.party_issue_selections USING btree (issue_option_id);


--
-- Name: idx_party_issues_party; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_party_issues_party ON public.party_issue_selections USING btree (party_id);


--
-- Name: v_cases_complete _RETURN; Type: RULE; Schema: public; Owner: -
--

CREATE OR REPLACE VIEW public.v_cases_complete AS
 SELECT c.id AS case_id,
    c.created_at,
    c.property_address,
    c.city,
    c.state,
    c.zip_code,
    c.filing_location,
    count(DISTINCT
        CASE
            WHEN ((p.party_type)::text = 'plaintiff'::text) THEN p.id
            ELSE NULL::uuid
        END) AS plaintiff_count,
    count(DISTINCT
        CASE
            WHEN ((p.party_type)::text = 'defendant'::text) THEN p.id
            ELSE NULL::uuid
        END) AS defendant_count,
    c.latest_payload
   FROM (public.cases c
     LEFT JOIN public.parties p ON ((c.id = p.case_id)))
  GROUP BY c.id;


--
-- Name: cases update_cases_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON public.cases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: discovery_details update_discovery_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_discovery_updated_at BEFORE UPDATE ON public.discovery_details FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: parties update_parties_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_parties_updated_at BEFORE UPDATE ON public.parties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: discovery_details discovery_details_party_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discovery_details
    ADD CONSTRAINT discovery_details_party_id_fkey FOREIGN KEY (party_id) REFERENCES public.parties(id) ON DELETE CASCADE;


--
-- Name: issue_options issue_options_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issue_options
    ADD CONSTRAINT issue_options_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.issue_categories(id) ON DELETE CASCADE;


--
-- Name: parties parties_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parties
    ADD CONSTRAINT parties_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.cases(id) ON DELETE CASCADE;


--
-- Name: party_issue_selections party_issue_selections_issue_option_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.party_issue_selections
    ADD CONSTRAINT party_issue_selections_issue_option_id_fkey FOREIGN KEY (issue_option_id) REFERENCES public.issue_options(id) ON DELETE CASCADE;


--
-- Name: party_issue_selections party_issue_selections_party_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.party_issue_selections
    ADD CONSTRAINT party_issue_selections_party_id_fkey FOREIGN KEY (party_id) REFERENCES public.parties(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict nOdMsCgV4uiRLsHmBK3Rx2mi4cpjtuUpQfFNzHxTylEQKqk01h4kTFlPI4obyWP

