-- Enable DELETE for all users for vehicle_issues table
CREATE POLICY "Enable delete for all users" ON vehicle_issues
    FOR DELETE USING (true);
