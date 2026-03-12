-- WIP Issue Header Table
CREATE TABLE IF NOT EXISTS work_in_progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    wip_number VARCHAR(50) UNIQUE NOT NULL,
    tenant_id INT NOT NULL,
    production_order_id INT NOT NULL,
    branch_id INT NOT NULL,
    machine_id INT,
    issue_date DATE NOT NULL,
    total_items INT DEFAULT 0,
    total_cost DECIMAL(15,2) DEFAULT 0,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (production_order_id) REFERENCES production_orders(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (machine_id) REFERENCES machines(id)
);

-- WIP Issue Lines Table
CREATE TABLE IF NOT EXISTS work_in_progress_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    work_in_progress_id INT NOT NULL,
    material_id INT NOT NULL,
    required_qty DECIMAL(15,2) DEFAULT 0,
    issued_qty DECIMAL(15,2) DEFAULT 0,
    available_qty DECIMAL(15,2) DEFAULT 0,
    issue_qty DECIMAL(15,2) NOT NULL,
    uom_id INT,
    unit_cost DECIMAL(15,2) DEFAULT 0,
    total_cost DECIMAL(15,2) DEFAULT 0,
    FOREIGN KEY (work_in_progress_id) REFERENCES work_in_progress(id) ON DELETE CASCADE,
    FOREIGN KEY (material_id) REFERENCES products(id),
    FOREIGN KEY (uom_id) REFERENCES uom(id)
);
