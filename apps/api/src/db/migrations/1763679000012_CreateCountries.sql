CREATE TABLE IF NOT EXISTS countries (
  "CountryID"  SERIAL PRIMARY KEY,
  "Name"       VARCHAR(100) NOT NULL UNIQUE,
  "Code"       CHAR(2)
);
INSERT INTO countries ("Name") VALUES
  ('Afghanistan'),('Albania'),('Algeria'),('Angola'),('Argentina'),
  ('Australia'),('Austria'),('Bahrain'),('Bangladesh'),('Belgium'),
  ('Brazil'),('Canada'),('China'),('Egypt'),('France'),
  ('Germany'),('India'),('Indonesia'),('Iran'),('Iraq'),
  ('Italy'),('Japan'),('Jordan'),('Kenya'),('Kuwait'),
  ('Lebanon'),('Libya'),('Malaysia'),('Mexico'),('Morocco'),
  ('Netherlands'),('Nigeria'),('Oman'),('Pakistan'),('Philippines'),
  ('Poland'),('Portugal'),('Qatar'),('Romania'),('Russia'),
  ('Saudi Arabia'),('Singapore'),('South Africa'),('South Korea'),('Spain'),
  ('Sudan'),('Sweden'),('Switzerland'),('Thailand'),('Turkey'),
  ('UAE'),('UK'),('USA'),('Ukraine'),('Vietnam')
ON CONFLICT ("Name") DO NOTHING;
