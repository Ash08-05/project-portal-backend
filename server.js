const express = require("express");
const dotenv = require("dotenv");
const mysql = require("mysql2/promise");
const cors = require("cors");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "https://portal-testing-1608.netlify.app");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});
app.use(express.json());

// Database connection string
const connectionString =
  "mysql://root:kJVOLDgsgvyvsEfiMKMbSYTlcvQtgoMn@junction.proxy.rlwy.net:17541/railway";

// Global database connection variable
let connection;

async function startServer() {
  try {
    // Connect to MySQL
    connection = await mysql.createConnection(connectionString);
    console.log("Successfully connected to the database!");

    // Middleware to attach DB instance and log requests
    app.use((req, res, next) => {
      req.db = connection;
      console.log(`${req.method} ${req.url}`);
      next();
    });

                                                                  // Root API Endpoint
    app.get("/", (req, res) => {
      res.send("Attendance Portal Backend is running!");
    });

                                                      // Employee Routes
    app.get("/api/employees", async (req, res) => {
      try {
        const [rows] = await req.db.execute("SELECT * FROM employees");
        res.json(rows);
      } catch (error) {
        console.error("Error fetching employees:", error.message);
        res.status(500).json({ error: "Error fetching employees" });
      }
    });
    

    app.post("/api/employees", async (req, res) => {
      const { name, employee_id, department, designation } = req.body;
    
      if (!name || !employee_id || !department || !designation) {
        return res.status(400).json({ error: "All fields are required" });
      }
    
      try {
        const query = "INSERT INTO employees (name, employee_id, department, designation) VALUES (?, ?, ?, ?)";
        const values = [name, employee_id, department, designation];
    
        await req.db.execute(query, values);
        res.status(201).json({ message: "Employee added successfully" });
      } catch (error) {
        console.error("Error adding employee:", error);
        res.status(500).json({ error: "Failed to add employee" });
      }
    });
    
 // Attendance Routes
 app.post("/api/attendance", async (req, res) => {
  const { employee_id, date, status } = req.body;
  console.log("Received Data:", { employee_id, date, status }); // Log received data

  if (!employee_id || !date || !status) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    await req.db.execute(
      "INSERT INTO attendance (employee_id, date, status) VALUES (?, ?, ?)",
      [employee_id, date, status]
    );
    res.json({ message: "Attendance recorded successfully" });
  } catch (error) {
    console.error("Error marking attendance:", error.message);
    res.status(500).json({ error: "Error marking attendance" });
  }
});
    app.get("/api/attendance", async (req, res) => {
      const query = `
        SELECT 
          attendance.id, 
          employees.name AS employee_name, 
          DATE(attendance.date) AS date, 
          attendance.status, 
          attendance.overtime_hours
        FROM 
          attendance
        JOIN 
          employees 
        ON 
          attendance.employee_id = employees.id;
      `;
      try {
        const [results] = await req.db.execute(query);
        res.json(results);
      } catch (err) {
        console.error("Database Query Error:", err.message);
        res.status(500).json({ error: "Failed to fetch attendance records" });
      }
    });

// Overtime Routes
    app.get("/api/overtime", async (req, res) => {
      const query = `
        SELECT 
          overtime.id AS overtime_id,
          employees.name AS employee_name,
          overtime.date,
          TIME(overtime.created_at) AS time,
          overtime.hours
        FROM 
          overtime
        JOIN 
          employees 
        ON 
          overtime.employee_id = employees.id;
      `;
      try {
        const [results] = await req.db.execute(query);
        res.json(results);
      } catch (err) {
        console.error("Error fetching overtime records:", err.message);
        res.status(500).json({ error: "Failed to fetch overtime records" });
      }
    });

    app.post("/api/overtime", async (req, res) => {
      const { employee_id, date, hours } = req.body;
      try {
        await req.db.execute(
          "INSERT INTO overtime (employee_id, date, hours) VALUES (?, ?, ?)",
          [employee_id, date, hours]
        );
        res.json({ message: "Overtime recorded successfully" });
      } catch (error) {
        console.error("Error adding overtime record:", error.message);
        res.status(500).json({ error: "Error adding overtime record" });
      }
    });

// Reports
 
app.get("/api/reports", async (req, res) => {
  try {
    const query = `
      SELECT r.*, e.name AS employee_name 
      FROM reports r 
      JOIN employees e ON r.employee_id = e.id;
    `;

    const [rows] = await req.db.execute(query);
    res.json(rows);
  } catch (error) {
    if (error.code === "ER_NO_SUCH_TABLE") {
      res.status(500).json({ error: "The reports table doesn't exist. Please create the table." });
    } else {
      res.status(500).json({ error: "An error occurred while fetching reports: " + error.message });
    }
  }
});
                                                                  

    // Handle 404 for undefined routes
    app.use((req, res) => {
      console.error(`Route not found: ${req.method} ${req.url}`);
      res.status(404).json({ error: "Not Found" });
    });

    // Start the server
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Error starting server:", error.message);
  }
}

startServer();
