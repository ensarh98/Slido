-- Database generated with pgModeler (PostgreSQL Database Modeler).
-- PostgreSQL version: 9.2
-- Project Site: pgmodeler.com.br
-- Model Author: ---

SET check_function_bodies = false;
-- ddl-end --


-- Database creation must be done outside an multicommand file.
-- These commands were put in this file only for convenience.
-- -- object: new_database | type: DATABASE --
-- CREATE DATABASE new_database
-- ;
-- -- ddl-end --
-- 

-- ddl-end --
-- object: public.users | type: TABLE --
CREATE TABLE public.users(
	id integer NOT NULL GENERATED ALWAYS AS IDENTITY,
	first_name varchar(40) NOT NULL,
	last_name varchar(100) NOT NULL,
	address varchar(400),
	city varchar(40),
	country varchar(100),
	birth_date timestamp,
	password varchar(4000) NOT NULL,
	email varchar(100) NOT NULL,
	is_admin boolean NOT NULL DEFAULT false,
	is_lecturer boolean NOT NULL DEFAULT false,
	banned_until timestamp NULL,
	is_valid boolean NOT NULL DEFAULT true,
	CONSTRAINT email_uq UNIQUE (email),
	CONSTRAINT user_pk PRIMARY KEY (id)
);

-- ddl-end --
-- object: public.lectures | type: TABLE --
CREATE TABLE public.lectures(
	id integer NOT NULL GENERATED ALWAYS AS IDENTITY,
	lecturer_id integer NOT NULL,
	code varchar(100) NOT NULL,
	name varchar(4000) NOT NULL,
	start_date timestamp NOT NULL,
	end_date timestamp NOT NULL,
	start_time time NOT NULL,
	schedule varchar(100) NOT NULL,
	duration integer NOT NULL,
	image_filename varchar(4000) NULL,
	CONSTRAINT code_uq UNIQUE (code),
	CONSTRAINT lectures_pk PRIMARY KEY (id)
);

-- ddl-end --
-- object: public.scheduled_lectures | type: TABLE --
CREATE TABLE public.scheduled_lectures(
	id integer NOT NULL GENERATED ALWAYS AS IDENTITY,
	lecture_id integer NOT NULL,
	lecture_date_time timestamp,
	is_valid boolean NOT NULL DEFAULT true,
	CONSTRAINT scheduled_lecture_pk PRIMARY KEY (id)
);

-- ddl-end --
-- object: public.lecture_guests | type: TABLE --
CREATE TABLE public.lecture_guests(
	id integer NOT NULL GENERATED ALWAYS AS IDENTITY,
	scheduled_lecture_id integer NOT NULL,
	guest_username varchar(40) NOT NULL,
	mark integer,
	CONSTRAINT guest_username_uq UNIQUE (guest_username),
	CONSTRAINT lecture_guests_pk PRIMARY KEY (id)
);
-- ddl-end --
-- object: public.lecture_questions | type: TABLE --
CREATE TABLE public.lecture_questions(
	id integer NOT NULL GENERATED ALWAYS AS IDENTITY,
	scheduled_lecture_id integer NOT NULL,
	lecture_guest_id integer NOT NULL,
	question text,
	date timestamp NOT NULL,
	is_answered boolean NOT NULL default false,
	is_hidden boolean NOT NULL default false,
	likes integer NOT NULL DEFAULT 0,
	dislikes integer NOT NULL DEFAULT 0,
	CONSTRAINT lecture_questions_pk PRIMARY KEY (id)

);
-- ddl-end --
-- object: public.forbidden_words | type: TABLE --
CREATE TABLE public.forbidden_words(
	id integer NOT NULL GENERATED ALWAYS AS IDENTITY,
	word text,
	CONSTRAINT forbidden_words_pk PRIMARY KEY (id)

);

-- object: lecture | type: CONSTRAINT --
ALTER TABLE public.lectures ADD CONSTRAINT lectures_users_fk FOREIGN KEY (lecturer_id)
REFERENCES public.users (id) MATCH FULL
ON DELETE NO ACTION ON UPDATE NO ACTION NOT DEFERRABLE;
-- ddl-end --

-- object: lecture | type: CONSTRAINT --
ALTER TABLE public.scheduled_lectures ADD CONSTRAINT schedule_lectures_lectures_fk FOREIGN KEY (lecture_id)
REFERENCES public.lectures (id) MATCH FULL
ON DELETE NO ACTION ON UPDATE NO ACTION NOT DEFERRABLE;
-- ddl-end --

-- object: lecture_guests_lecture_pk | type: CONSTRAINT --
ALTER TABLE public.lecture_guests ADD CONSTRAINT lecture_guests_lectures_fk FOREIGN KEY (scheduled_lecture_id)
REFERENCES public.scheduled_lectures (id) MATCH FULL
ON DELETE NO ACTION ON UPDATE NO ACTION NOT DEFERRABLE;
-- ddl-end --


-- object: lectures_questions_lectures_pk | type: CONSTRAINT --
ALTER TABLE public.lecture_questions ADD CONSTRAINT lectures_questions_lectures_fk FOREIGN KEY (scheduled_lecture_id)
REFERENCES public.scheduled_lectures (id) MATCH FULL
ON DELETE NO ACTION ON UPDATE NO ACTION NOT DEFERRABLE;
-- ddl-end --


-- object: lecture_questions_users_pk | type: CONSTRAINT --
ALTER TABLE public.lecture_questions ADD CONSTRAINT lecture_quest_lect_guest_fk FOREIGN KEY (lecture_guest_id)
REFERENCES public.lecture_guests (id) MATCH FULL
ON DELETE NO ACTION ON UPDATE NO ACTION NOT DEFERRABLE;
-- ddl-end --

