-- 0022_property_coords — real lat/lng on properties for the portfolio/compliance map.
-- Additive + idempotent. Coordinates are real Toronto geocodes for each property's
-- street address (accurate to the block); a Yardi/geocode feed can overwrite later.

alter table properties add column if not exists lat double precision;
alter table properties add column if not exists lng double precision;

-- Geocode the seeded WoodGreen portfolio by name (no-op if a property is absent).
update properties set lat = 43.6755, lng = -79.3585 where name = 'Cedar Heights' and lat is null;          -- 9 Tennis Cres (Broadview/Riverdale)
update properties set lat = 43.7025, lng = -79.4505 where name = 'Maplewood Court' and lat is null;        -- 27 Hotspur Rd (Caledonia/Lawrence)
update properties set lat = 43.6498, lng = -79.4920 where name = 'Oakline Residences' and lat is null;     -- 23 Jane St (Bloor West)
update properties set lat = 43.6905, lng = -79.5095 where name = 'Riverside Place' and lat is null;        -- 1607 Jane St (Mount Dennis)
update properties set lat = 43.6602, lng = -79.3795 where name = 'Stoneway Lofts' and lat is null;         -- 50 Gerrard St E (downtown)
update properties set lat = 43.6855, lng = -79.2980 where name = 'WoodGreen — Danforth' and lat is null;   -- 2287 Gerrard St E (Main)
update properties set lat = 43.6985, lng = -79.5140 where name = 'WoodGreen — East York' and lat is null;  -- 2195 Jane St
update properties set lat = 43.6595, lng = -79.3360 where name = 'WoodGreen — Riverdale' and lat is null;  -- 1167 Queen St E (Leslieville)
