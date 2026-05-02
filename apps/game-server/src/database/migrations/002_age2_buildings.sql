-- Age 2 building types migration
-- Adds new building types for Age 2 content

-- Add new building types to the buildings table check constraint
-- (if using enum column, we extend it; if using varchar, we just document)

-- New Age 2 buildings seeding (for reference / seed scripts):
-- nano_forge, cyber_core, quantum_reactor, defense_matrix, repair_drone_bay

COMMENT ON TABLE buildings IS 'Player buildings. Age 2 types: nano_forge, cyber_core, quantum_reactor, defense_matrix, repair_drone_bay';
