const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const PORT = 3000;

// إعداد قاعدة البيانات
const db = new sqlite3.Database("./works.db", (err) => {
  if (err) console.error(err.message);
  console.log("Connected to SQLite database.");
});

// إنشاء الجدول إذا لم يكن موجودًا
db.run(`
  CREATE TABLE IF NOT EXISTS works (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    piece_type TEXT NOT NULL,
    reference_number TEXT NOT NULL,
    operation_type TEXT NOT NULL,
    operation_date TEXT NOT NULL,
    delivery_details TEXT,
    delivery_date TEXT
  )
`);

// إعداد الميدل وير
app.use(cors());
app.use(bodyParser.json());

// استرجاع جميع الأعمال
app.get("/works", (req, res) => {
  db.all("SELECT * FROM works", [], (err, rows) => {
    if (err) return res.status(500).json(err.message);
    res.json(rows);
  });
});

// إضافة عمل جديد
app.post("/works", (req, res) => {
  const { piece_type, reference_number, operation_type, operation_date } =
    req.body;
  db.run(
    `INSERT INTO works (piece_type, reference_number, operation_type, operation_date) VALUES (?, ?, ?, ?)`,
    [piece_type, reference_number, operation_type, operation_date],
    function (err) {
      if (err) return res.status(500).json(err.message);
      res.json({ id: this.lastID });
    }
  );
});

// تحديث عمل للتسليم
app.put("/works/:id", (req, res) => {
  const { operation_type, delivery_details, delivery_date } = req.body;
  db.run(
    `UPDATE works SET operation_type = ?, delivery_details = ?, delivery_date = ? WHERE id = ?`,
    [operation_type, delivery_details, delivery_date, req.params.id],
    function (err) {
      if (err) return res.status(500).json(err.message);
      res.json({ updated: this.changes });
    }
  );
});

// حذف عمل
app.delete("/works/:id", (req, res) => {
  db.run(`DELETE FROM works WHERE id = ?`, req.params.id, function (err) {
    if (err) return res.status(500).json(err.message);
    res.json({ deleted: this.changes });
  });
});

// تشغيل الخادم
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);

/* const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const app = express();

app.use(express.json());

// فتح اتصال قاعدة البيانات
const db = new sqlite3.Database("./database.db", (err) => {
  if (err) console.error("Error opening database:", err.message);
});

// إنشاء جدول الدول إذا لم يكن موجودًا
db.run(`
    CREATE TABLE IF NOT EXISTS countries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        code TEXT NOT NULL UNIQUE
    )
`);

// إضافة دولة جديدة
app.post("/add-country", (req, res) => {
  const { name, code } = req.body;

  if (!name || !code) {
    return res.status(400).json({ error: "يرجى إدخال اسم الدولة والكود." });
  }

  db.run(
    `INSERT INTO countries (name, code) VALUES (?, ?)`,
    [name, code],
    function (err) {
      if (err) {
        console.error("Error adding country:", err.message);
        return res.status(500).json({ error: "خطأ في إضافة الدولة." });
      }
      res.json({ message: "تمت إضافة الدولة بنجاح.", id: this.lastID });
    }
  );
});

// جلب قائمة الدول
app.get("/get-countries", (req, res) => {
  db.all(`SELECT * FROM countries`, [], (err, rows) => {
    if (err) {
      console.error("Error fetching countries:", err.message);
      return res.status(500).json({ error: "خطأ في جلب قائمة الدول." });
    }
    res.json(rows);
  });
});

// تشغيل الخادم
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// const express = require("express");
// const sqlite3 = require("sqlite3").verbose();
// const app = express();

// const db = new sqlite3.Database("./database.db");

// app.use(express.json());

// // نقطة النهاية لجلب الرقم المرجعي
// app.get("/get-reference-number", (req, res) => {
//   const currentDate = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

//   db.get(
//     `SELECT reference_number, last_updated FROM work_reference WHERE id = 1`,
//     (err, row) => {
//       if (err) {
//         console.error("Error fetching reference number:", err.message);
//         return res.status(500).json({ error: "خطأ في جلب الرقم المرجعي" });
//       }

//       if (row) {
//         // إذا كان اليوم قد تغير
//         if (row.last_updated !== currentDate) {
//           // إعادة الرقم إلى 1 وتحديث التاريخ
//           db.run(
//             `UPDATE work_reference SET reference_number = 1, last_updated = ? WHERE id = 1`,
//             [currentDate],
//             (updateErr) => {
//               if (updateErr) {
//                 console.error(
//                   "Error resetting reference number:",
//                   updateErr.message
//                 );
//                 return res
//                   .status(500)
//                   .json({ error: "خطأ في إعادة تعيين الرقم المرجعي" });
//               }
//               res.json({ referenceNumber: 1 });
//             }
//           );
//         } else {
//           // زيادة الرقم المرجعي بمقدار 1
//           const newReferenceNumber = row.reference_number + 1;
//           db.run(
//             `UPDATE work_reference SET reference_number = ? WHERE id = 1`,
//             [newReferenceNumber],
//             (updateErr) => {
//               if (updateErr) {
//                 console.error(
//                   "Error updating reference number:",
//                   updateErr.message
//                 );
//                 return res
//                   .status(500)
//                   .json({ error: "خطأ في تحديث الرقم المرجعي" });
//               }
//               res.json({ referenceNumber: newReferenceNumber });
//             }
//           );
//         }
//       } else {
//         // إذا لم تكن هناك بيانات، قم بإضافة السجل الأول
//         db.run(
//           `INSERT INTO work_reference (reference_number, last_updated) VALUES (1, ?)`,
//           [currentDate],
//           (insertErr) => {
//             if (insertErr) {
//               console.error(
//                 "Error inserting initial reference number:",
//                 insertErr.message
//               );
//               return res
//                 .status(500)
//                 .json({ error: "خطأ في إنشاء الرقم المرجعي الأول" });
//             }
//             res.json({ referenceNumber: 1 });
//           }
//         );
//       }
//     }
//   );
// });

// // تشغيل الخادم
// app.listen(3000, () => {
//   console.log("Server running on http://localhost:3000");
// });

/* const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

// إنشاء جدول استلام الأعمال
db.run(`
  CREATE TABLE IF NOT EXISTS work_receiving (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_name TEXT NOT NULL,
    work_type TEXT NOT NULL,
    reference_number INTEGER NOT NULL,
    status TEXT NOT NULL,
    date TEXT NOT NULL
  )
`, (err) => {
  if (err) {
    console.error("Error creating work_receiving table:", err.message);
  } else {
    console.log("Table 'work_receiving' is ready.");
  }
});

// أغلق قاعدة البيانات عند الانتهاء
db.close((err) => {
  if (err) {
    console.error("Error closing the database:", err.message);
  } else {
    console.log("Database connection closed.");
  }
});





const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();

const app = express();
app.use(bodyParser.json());

// الاتصال بقاعدة البيانات
const db = new sqlite3.Database('./database.db');

// نقطة النهاية لإضافة بيانات استلام الأعمال
app.post('/add-receive-work', (req, res) => {
  const { clientName, workType, referenceNumber, status, date } = req.body;

  if (!clientName || !workType || !referenceNumber || !status || !date) {
    return res.status(400).json({ error: "جميع الحقول مطلوبة." });
  }

  const query = `
    INSERT INTO work_receiving (client_name, work_type, reference_number, status, date)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.run(query, [clientName, workType, referenceNumber, status, date], function (err) {
    if (err) {
      console.error("Error adding work receiving:", err.message);
      return res.status(500).json({ error: "خطأ أثناء إضافة البيانات." });
    }

    res.json({ message: "تمت إضافة البيانات بنجاح.", id: this.lastID });
  });
});

// تشغيل الخادم
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
 */
