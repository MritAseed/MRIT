const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const app = express();
const PORT = 3000;

/* ================== START SQL =========================
 إعداد قاعدة البيانات (SQLite)
==============================================  */
const db = new sqlite3.Database("./database.db", (err) => {
  if (err) {
    console.error("Error opening SQLite database:", err);
  } else {
    console.log("Connected to the SQLite database.");

    // إنشاء جدول العملاء إذا لم يكن موجودًا
    db.run(`CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
    )`);

    // إنشاء جدول المعاملات إذا لم يكن موجودًا
    db.run(`CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_name TEXT NOT NULL,
        amount REAL NOT NULL,
        details TEXT,
        transaction_type TEXT NOT NULL,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_name) REFERENCES clients(name)
    )`);

    // إنشاء جدول أنواع الأعمال إذا لم يكن موجودًا
    db.run(`CREATE TABLE IF NOT EXISTS work_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    work_type TEXT NOT NULL,
    price REAL NOT NULL,
    work_id TEXT UNIQUE NOT NULL
)`);

    // إنشاء جدول الموظفين
    db.run(`CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    position TEXT,
    salary REAL
)`);

    // إنشاء جدول العمليات المالية المرتبطة بالموظفين
    db.run(`CREATE TABLE IF NOT EXISTS employee_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    details TEXT,
    date TEXT NOT NULL,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
)`);

    console.log("Tables created or verified successfully.");
  }
});
module.exports = db;
// استخدام body-parser لتفسير بيانات JSON
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

//  ================== END SQL =========================
/* ===================START BACKUP===============================
                   النسخ الاحتياطي المحلي
================================================================*/
// إعداد multer لحفظ الملفات
const upload = multer({ dest: "uploads/" });
// مسار مجلد النسخ الاحتياطي على القرص D
const backupFolderPath = path.join("D:", "DatabaseBackups");
// إنشاء مجلد النسخ الاحتياطي إذا لم يكن موجودًا
if (!fs.existsSync(backupFolderPath)) {
  fs.mkdirSync(backupFolderPath, { recursive: true });
}
// دالة لإنشاء نسخة احتياطية
app.get("/api/backup", (req, res) => {
  const timestamp = new Date().toISOString().replace(/:/g, "-");
  const backupFileName = `backup-${timestamp}.sqlite`;
  const backupFilePath = path.join("D:", "DatabaseBackups", backupFileName);

  fs.copyFile("./database.db", backupFilePath, (err) => {
    if (err) {
      console.error("Error creating backup:", err);
      return res.status(500).json({ message: "Error creating backup" });
    }
    console.log("Database backup created successfully:", backupFilePath);
    res.json({
      message: "نجح   إنشاء النسخة الاحتياطية ",
      path: backupFilePath,
    });
  });
});
// دالة لاستيراد نسخة احتياطية
app.post("/api/restore", upload.single("backupFile"), (req, res) => {
  const backupFilePath = req.file.path;

  fs.copyFile(backupFilePath, "./database.db", (err) => {
    if (err) {
      console.error("Error restoring backup:", err);
      return res.status(500).json({ message: "Error restoring backup" });
    }
    console.log("Database restored successfully from backup:", backupFilePath);

    // حذف الملف المرفوع بعد الاستعادة
    fs.unlink(backupFilePath, (err) => {
      if (err) console.error("Error deleting uploaded backup file:", err);
    });

    res.json({ message: "نجح   إستيراد النسخة الاحتياطية " });
  });
});
// نقطة نهاية لحذف جميع البيانات من الجداول
app.delete("/api/delete", (req, res) => {
  const tables = [
    "clients",
    "transactions",
    "work_types",
    "employees",
    "employee_transactions",
  ];

  const deletePromises = tables.map((table) => {
    return new Promise((resolve, reject) => {
      db.run(`DELETE FROM ${table}`, (err) => {
        if (err) {
          console.error(`Error clearing table ${table}:`, err);
          reject(err);
        } else {
          console.log(`Cleared table: ${table}`);
          resolve();
        }
      });
    });
  });

  Promise.all(deletePromises)
    .then(() => {
      // تشغيل أمر VACUUM لتحرير المساحة
      db.run("VACUUM", (err) => {
        if (err) {
          console.error("Error running VACUUM:", err);
          res
            .status(500)
            .json({
              message: "حدث خطأ أثناء تحرير المساحة.",
              error: err.message,
            });
        } else {
          console.log("Database vacuumed successfully.");
          res.json({ message: "تم حذف جميع البيانات وتحرير المساحة بنجاح." });
        }
      });
    })
    .catch((err) => {
      res
        .status(500)
        .json({ message: "حدث خطأ أثناء حذف البيانات.", error: err.message });
    });
});

// =====================================================
//           TRO MARG
// ======================================================

// =====================================================
//           TRO MARG
// ======================================================
// ======================================================
const mergeBackupWithIdUpdate = async (backupDb, res) => {
  try {
    // === خطوة 1: جلب آخر المعرفات في الجداول الحالية ===
    const getLastId = (table) =>
      new Promise((resolve, reject) => {
        db.get(`SELECT MAX(id) AS maxId FROM ${table}`, (err, row) => {
          if (err) {
            console.error(`Error fetching max ID from ${table}:`, err);
            return reject(err);
          }
          resolve(row?.maxId || 0);
        });
      });

    const currentMaxClientId = await getLastId("clients");
    const currentMaxTransactionId = await getLastId("transactions");
    const currentMaxWorkTypeId = await getLastId("work_types");
    const currentMaxEmployeeId = await getLastId("employees");
    const currentMaxEmployeeTransactions = await getLastId(
      "employee_transactions"
    );

    console.log(
      `Current max IDs - clients: ${currentMaxClientId}, transactions: ${currentMaxTransactionId}, work_types: ${currentMaxWorkTypeId}, employees: ${currentMaxEmployeeId}, employee_transactions ${currentMaxEmployeeTransactions}`
    );
    /* ======================================================================== */
    const mergeClientsAndTransactions = () =>
      new Promise((resolve, reject) => {
        // جلب جميع العملاء والعمليات من النسخة الاحتياطية
        backupDb.all(
          "SELECT client_name, amount, details, transaction_type, date FROM transactions",
          (err, rows) => {
            if (err) {
              console.error("Error fetching transactions from backup:", err);
              return reject(err);
            }

            // جلب قائمة العملاء الحالية
            db.all("SELECT name FROM clients", (err, existingClients) => {
              if (err) {
                console.error("Error fetching existing clients:", err);
                return reject(err);
              }

              const existingClientNames = existingClients.map((client) =>
                client.name.trim().toLowerCase()
              );
              const clientNameMap = new Map(); // تخزين العميل واسم الجديد (إذا كان موجودًا)
              const transactionsToInsert = [];

              rows.forEach((row) => {
                const trimmedName = row.client_name.trim();
                let finalName = trimmedName;

                // إذا كان الاسم موجودًا بالفعل في قاعدة البيانات الحالية
                if (existingClientNames.includes(trimmedName.toLowerCase())) {
                  if (!clientNameMap.has(trimmedName)) {
                    // إنشاء اسم جديد وإضافته للخريطة
                    let count = 1;
                    while (
                      existingClientNames.includes(finalName.toLowerCase())
                    ) {
                      finalName = `${trimmedName} جديد${
                        count > 1 ? ` ${count}` : ""
                      }`;
                      count++;
                    }
                    clientNameMap.set(trimmedName, finalName);
                    existingClientNames.push(finalName.toLowerCase());
                  } else {
                    // استخدم الاسم الجديد من الخريطة
                    finalName = clientNameMap.get(trimmedName);
                  }
                } else {
                  // إذا لم يكن الاسم موجودًا بالفعل
                  if (!clientNameMap.has(trimmedName)) {
                    clientNameMap.set(trimmedName, finalName);
                    existingClientNames.push(finalName.toLowerCase());
                  } else {
                    finalName = clientNameMap.get(trimmedName);
                  }
                }

                // إضافة العملية إلى القائمة
                transactionsToInsert.push({
                  client_name: finalName,
                  amount: row.amount,
                  details: row.details,
                  transaction_type: row.transaction_type,
                  date: row.date,
                });
              });

              // إدخال العملاء الجدد إلى قاعدة البيانات
              const clientInsertPromises = Array.from(
                clientNameMap.values()
              ).map(
                (clientName) =>
                  new Promise((resolve, reject) => {
                    db.run(
                      "INSERT INTO clients (name) VALUES (?)",
                      [clientName],
                      (err) => {
                        if (err) {
                          console.error("Error inserting client:", err);
                          return reject(err);
                        }
                        resolve();
                      }
                    );
                  })
              );

              // انتظار إدخال العملاء أولاً قبل العمليات
              Promise.all(clientInsertPromises)
                .then(() => {
                  // إدخال العمليات إلى قاعدة البيانات
                  const transactionInsertPromises = transactionsToInsert.map(
                    (transaction) =>
                      new Promise((resolve, reject) => {
                        db.run(
                          `INSERT INTO transactions (client_name, amount, details, transaction_type, date)
                     VALUES (?, ?, ?, ?, ?)`,
                          [
                            transaction.client_name,
                            transaction.amount,
                            transaction.details,
                            transaction.transaction_type,
                            transaction.date,
                          ],
                          (err) => {
                            if (err) {
                              console.error(
                                "Error inserting transaction:",
                                err
                              );
                              return reject(err);
                            }
                            resolve();
                          }
                        );
                      })
                  );

                  return Promise.all(transactionInsertPromises);
                })
                .then(() => resolve())
                .catch((err) => reject(err));
            });
          }
        );
      });

    // استدعاء الدالة
    mergeClientsAndTransactions()
      .then(() => console.log("Client transactions merged successfully."))
      .catch((err) => console.error("Error merging client transactions:", err));

    /* ======================================================================== */
    // === خطوة 4: دمج جدول أنواع الأعمال ===
    const mergeWorkTypes = () =>
      new Promise((resolve, reject) => {
        backupDb.all(
          "SELECT id, work_type, price, work_id FROM work_types",
          (err, rows) => {
            if (err) {
              console.error("Error fetching work types from backup:", err);
              return reject(err);
            }

            const insertPromises = rows.map((row, index) => {
              const newId = currentMaxWorkTypeId + index + 1; // تخصيص ID جديد
              db.run(
                `INSERT OR IGNORE INTO work_types (id, work_type, price, work_id) VALUES (?, ?, ?, ?)`,
                [newId, row.work_type, row.price, row.work_id],
                (err) => {
                  if (err) {
                    console.error("Error inserting work type:", err);
                    return reject(err);
                  }
                }
              );
            });

            Promise.all(insertPromises)
              .then(() => resolve())
              .catch((err) => reject(err));
          }
        );
      });

    await mergeWorkTypes();
    console.log("Work types merged successfully.");
    // ===============================
    // === خطوة 6: دمج جدول عمليات الموظفين ===

    // ========================بعساس==============
    const mergeEmployeesAndTransactions = () =>
      new Promise((resolve, reject) => {
        backupDb.all(
          `SELECT 
        e.id as employee_id, 
        e.name, 
        e.position, 
        e.salary, 
        et.id as transaction_id, 
        et.type, 
        et.amount, 
        et.details, 
        et.date 
      FROM employees e 
      LEFT JOIN employee_transactions et 
      ON e.id = et.employee_id`,
          async (err, rows) => {
            if (err) {
              console.error(
                "Error fetching employees and transactions from backup:",
                err
              );
              return reject(err);
            }

            let currentMaxEmployeeId = await new Promise((resolve, reject) => {
              db.get(
                "SELECT MAX(id) as maxEmployeeId FROM employees",
                (err, result) => {
                  if (err) {
                    console.error("Error fetching max employee ID:", err);
                    return reject(err);
                  }
                  resolve(result?.maxEmployeeId || 0);
                }
              );
            });

            let currentMaxTransactionId = await new Promise(
              (resolve, reject) => {
                db.get(
                  "SELECT MAX(id) as maxTransactionId FROM employee_transactions",
                  (err, result) => {
                    if (err) {
                      console.error("Error fetching max transaction ID:", err);
                      return reject(err);
                    }
                    resolve(result?.maxTransactionId || 0);
                  }
                );
              }
            );

            const employeeIdMap = new Map();

            for (const row of rows) {
              let finalName = row.name;

              // إذا كان الاسم موجودًا بالفعل في الخريطة، أضف كلمة "جديد"
              if (!employeeIdMap.has(row.name)) {
                const existingEmployee = await new Promise(
                  (resolve, reject) => {
                    db.get(
                      "SELECT id FROM employees WHERE name = ?",
                      [row.name],
                      (err, result) => {
                        if (err) {
                          console.error(
                            "Error checking employee existence:",
                            err
                          );
                          return reject(err);
                        }
                        resolve(result);
                      }
                    );
                  }
                );

                if (existingEmployee) {
                  finalName = `${row.name} جديد`;
                }

                const newEmployeeId = ++currentMaxEmployeeId;

                await new Promise((resolve, reject) => {
                  db.run(
                    `INSERT INTO employees (id, name, position, salary) VALUES (?, ?, ?, ?)`,
                    [newEmployeeId, finalName, row.position, row.salary],
                    (err) => {
                      if (err) {
                        console.error("Error inserting employee:", err);
                        return reject(err);
                      }
                      employeeIdMap.set(row.name, newEmployeeId);
                      resolve();
                    }
                  );
                });
              }

              // إدراج العملية المالية إذا كانت موجودة
              if (row.transaction_id) {
                const newTransactionId = ++currentMaxTransactionId;
                const newEmployeeId = employeeIdMap.get(row.name);

                await new Promise((resolve, reject) => {
                  db.run(
                    `INSERT INTO employee_transactions (id, employee_id, type, amount, details, date) VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                      newTransactionId,
                      newEmployeeId,
                      row.type,
                      row.amount,
                      row.details,
                      row.date,
                    ],
                    (err) => {
                      if (err) {
                        console.error("Error inserting transaction:", err);
                        return reject(err);
                      }
                      resolve();
                    }
                  );
                });
              }
            }

            resolve();
          }
        );
      });

    await mergeEmployeesAndTransactions();
    console.log(
      "Employees and their transactions merged successfully without duplication!"
    );

    // ========================================
    // ========================================

    res.json({ message: "تم دمج البيانات بنجاح." });
  } catch (error) {
    console.error("Error during merge:", error);
    res
      .status(500)
      .json({ message: "حدث خطأ أثناء دمج البيانات.", error: error.message });
  }
};

app.post("/api/merge", upload.single("backupFile"), (req, res) => {
  const backupFilePath = req.file.path;

  // فتح قاعدة البيانات الاحتياطية
  const backupDb = new sqlite3.Database(backupFilePath, (err) => {
    if (err) {
      console.error("Error opening backup SQLite database:", err);
      return res.status(500).json({ message: "فشل فتح النسخة الاحتياطية." });
    }

    console.log("Opened backup SQLite database.");

    // تنفيذ عملية الدمج
    mergeBackupWithIdUpdate(backupDb, res).finally(() => {
      backupDb.close();
      fs.unlinkSync(backupFilePath); // حذف الملف المؤقت
    });
  });
});

// ======================================================

//  ===================END BACKUP===============================
/* // ================= START ADD DELETE NEAM ========================
                    // إضافةاو حذف عميل جديد 
======================================================================*/
// إضافة عميل جديد
app.post("/add-customer", (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ message: "اسم العميل مطلوب" });
  }

  // التحقق من وجود العميل مسبقًا
  const checkQuery = `SELECT * FROM clients WHERE name = ?`;
  db.get(checkQuery, [name], (err, row) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "حدث خطأ أثناء التحقق من وجود العميل" });
    }

    if (row) {
      return res.status(400).json({ message: "هذا العميل موجود بالفعل" });
    }

    // إذا لم يكن موجودًا، يتم إضافة العميل
    const insertQuery = `INSERT INTO clients (name) VALUES (?)`;
    db.run(insertQuery, [name], function (err) {
      if (err) {
        return res.status(500).json({ message: "حدث خطأ أثناء إضافة العميل" });
      }
      res.json({ message: "تمت إضافة العميل بنجاح!" });
    });
  });
});
//  حذف عميل
app.post("/delete-customer", (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ message: "اسم العميل مطلوب" });
  }

  // استعلام لحذف جميع العمليات المرتبطة بالعميل
  const deleteTransactionsQuery = `DELETE FROM transactions WHERE client_name = ?`;
  db.run(deleteTransactionsQuery, [name], function (err) {
    if (err) {
      return res
        .status(500)
        .json({ message: "حدث خطأ أثناء حذف العمليات المرتبطة بالعميل" });
    }

    // استعلام لحذف العميل
    const deleteClientQuery = `DELETE FROM clients WHERE name = ?`;
    db.run(deleteClientQuery, [name], function (err) {
      if (err) {
        return res.status(500).json({ message: "حدث خطأ أثناء حذف العميل" });
      }
      if (this.changes === 0) {
        return res.status(404).json({ message: "العميل غير موجود" });
      }
      res.json({ message: "تم حذف العميل وجميع العمليات التابعة له بنجاح!" });
    });
  });
});
// جلب ارصدة العملاء
app.get("/api/get-client-balances", (req, res) => {
  const query = `
        SELECT clients.name AS client_name, 
               IFNULL(SUM(CASE WHEN transactions.transaction_type = 'add' THEN transactions.amount 
                              WHEN transactions.transaction_type = 'pay' THEN -transactions.amount 
                              ELSE 0 END), 0) AS balance
        FROM clients
        LEFT JOIN transactions ON clients.name = transactions.client_name
        GROUP BY clients.name
        ORDER BY clients.id
    `;

  db.all(query, (err, rows) => {
    if (err) {
      console.error("Error fetching balances:", err);
      res.status(500).json({ error: "Failed to fetch client balances" });
    } else {
      res.json(rows);
    }
  });
});
// ================= END ADD DELETE NEAM ========================
/* ====================START TRANSACTION==========================
                        إضافة أو تسديد مبلغ
============================================================*/
app.post("/transaction", (req, res) => {
  const { name, amount, details, transactionType } = req.body;

  if (!name || !amount || !transactionType) {
    return res
      .status(400)
      .json({ success: false, message: "جميع الحقول مطلوبة" });
  }

  const query = `INSERT INTO transactions (client_name, amount, details, transaction_type) VALUES (?, ?, ?, ?)`;
  db.run(query, [name, amount, details, transactionType], function (err) {
    if (err) {
      return res
        .status(500)
        .json({ success: false, message: "حدث خطأ أثناء حفظ العملية" });
    }
    res.json({ success: true, message: "تم حفظ العملية بنجاح!" });
  });
});
//  ====================END TRANSACTION==========================
/* ===================START SEARCH===============================
                     البحث عن عميل
================================================================*/
// نقطة النهاية لجلب العملاء (الإكمال التلقائي)
app.get("/api/get-customers", (req, res) => {
  const query = `SELECT name FROM clients`;
  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ message: "حدث خطأ أثناء جلب العملاءback" });
    }
    const customerNames = rows.map((row) => row.name);
    res.json(customerNames);
  });
});
// نقطة النهاية لجلب العمليات حسب اسم العميل
app.get("/api/get-transactions/:name", (req, res) => {
  const clientName = req.params.name;

  const query = `SELECT * FROM transactions WHERE client_name = ? ORDER BY date DESC`;
  db.all(query, [clientName], (err, rows) => {
    if (err) {
      return res.status(500).json({ message: " العميل غير موجود bacak" });
    }
    if (rows.length === 0) {
      return res
        .status(404)
        .json({ message: "العميل غير موجود أو لا توجد عمليات back" });
    }
    res.json(rows);
  });
});
// نقطة النهاية لجلب عملية واحدة (لأغراض التعديل)
app.get("/api/get-transaction/:id", (req, res) => {
  const transactionId = req.params.id;

  const query = `SELECT * FROM transactions WHERE id = ?`;
  db.get(query, [transactionId], (err, row) => {
    if (err) {
      return res.status(500).json({ message: "حدث خطأ أثناء جلب العملية" });
    }
    if (!row) {
      return res.status(404).json({ message: "العملية غير موجودة" });
    }
    res.json(row);
  });
});
// نقطة النهاية لتعديل عملية
app.post("/api/edit-transaction", (req, res) => {
  const { id, amount, details } = req.body;

  if (!id || !amount) {
    return res.status(400).json({ message: "جميع الحقول مطلوبة" });
  }

  const query = `UPDATE transactions SET amount = ?, details = ? WHERE id = ?`;
  db.run(query, [amount, details, id], function (err) {
    if (err) {
      return res.status(500).json({ message: "حدث خطأ أثناء تعديل العملية" });
    }
    if (this.changes === 0) {
      return res.status(404).json({ message: "العملية غير موجودة" });
    }
    res.json({ success: true, message: "تم تعديل العملية بنجاح" });
  });
});
// نقطة النهاية لحذف عملية
app.delete("/api/delete-transaction/:id", (req, res) => {
  const transactionId = req.params.id;

  const query = `DELETE FROM transactions WHERE id = ?`;
  db.run(query, [transactionId], function (err) {
    if (err) {
      return res.status(500).json({ message: "حدث خطأ أثناء حذف العملية" });
    }
    if (this.changes === 0) {
      return res.status(404).json({ message: "العملية غير موجودة" });
    }
    res.json({ success: true, message: "تم حذف العملية بنجاح" });
  });
});
//  نقطة النهاية لتوليد كشف حساب العميل BDF
app.get("/api/transactions", (req, res) => {
  const clientName = req.query.client_name;
  const query = `SELECT * FROM transactions WHERE client_name = ? ORDER BY date DESC`;

  db.all(query, [clientName], (err, rows) => {
    if (err) {
      console.error("حدث خطأ أثناء جلب البيانات من قاعدة البيانات:", err);
      return res.status(500).json({ message: "حدث خطأ أثناء جلب العمليات" });
    }

    // console.log("البيانات المسترجعة من قاعدة البيانات:", rows); // طباعة البيانات في Console الخادم
    res.json(rows); // إعادة البيانات كـ JSON
  });
});
//  ===================END SEARCH===============================

/* ===================START INDEX===============================
                     الصفحة الرئيسية
================================================================*/
// نقطة نهاية لجلب عدد العملاء
app.get("/get-customer-count", (req, res) => {
  const query = `SELECT COUNT(*) AS count FROM clients`;
  db.get(query, [], (err, row) => {
    if (err) {
      return res.status(500).json({ message: "حدث خطأ أثناء جلب عدد العملاء" });
    }
    res.json({ count: row.count });
  });
});
//  ===================END INDEX===============================
/* ===================START WORKTYPES===============================
                       ادارة الاعمال  
================================================================*/
// إضافة عمل جديد
app.post("/add-work", (req, res) => {
  const { work_type, price, work_id } = req.body;

  const query = `INSERT INTO work_types (work_type, price, work_id) VALUES (?, ?, ?)`;
  db.run(query, [work_type, price, work_id], function (err) {
    if (err) {
      console.error("Error adding work type:", err.message);
      return res.status(500).json({ message: "حدث خطأ أثناء إضافة العمل" });
    }
    res.json({ message: "تم إضافة العمل بنجاح!" });
  });
});
// جلب كل أنواع الأعمال
app.get("/get-works", (req, res) => {
  const query = `SELECT * FROM work_types`;
  db.all(query, (err, rows) => {
    if (err) {
      console.error("Error fetching works:", err.message);
      return res.status(500).json({ message: "حدث خطأ أثناء جلب الأعمال" });
    }
    res.json(rows);
  });
});
//  حذف عمل
app.post("/delete-work", (req, res) => {
  const { work_id } = req.body;
  console.log("Received work_id for deletion:", work_id); // تحقق من وصول work_id

  const query = `DELETE FROM work_types WHERE work_id = ?`;
  db.run(query, [work_id], function (err) {
    if (err) {
      console.error("Error deleting work:", err.message);
      return res.status(500).json({ message: "حدث خطأ أثناء حذف العمل" });
    }
    if (this.changes === 0) {
      return res.status(404).json({ message: "نوع العمل غير موجود" });
    }
    res.json({ message: "تم حذف العمل بنجاح!" });
  });
});
// نقطة النهاية لتعديل نوع العمل
app.post("/update-work", (req, res) => {
  const { work_id, work_type, price } = req.body;

  // التحقق من وجود جميع البيانات المطلوبة
  if (!work_id || !work_type || !price) {
    return res
      .status(400)
      .json({ message: "الرجاء تقديم جميع البيانات المطلوبة" });
  }

  // استعلام التعديل
  const query = `UPDATE work_types SET work_type = ?, price = ? WHERE work_id = ?`;

  db.run(query, [work_type, price, work_id], function (err) {
    if (err) {
      console.error("Error updating work:", err.message);
      return res.status(500).json({ message: "حدث خطأ أثناء تعديل نوع العمل" });
    }

    if (this.changes === 0) {
      // إذا لم يتم العثور على العمل الذي يحتوي على work_id المحدد
      return res
        .status(404)
        .json({ message: "لم يتم العثور على العمل المطلوب" });
    }

    res.json({ message: "تم تعديل نوع العمل بنجاح" });
  });
});
// ============================END  workTypes ==================================
/* ===================START PRODUCTS===============================
                    اضاقت معاملات نقدية 
================================================================*/
app.use(express.json());
// استرجاع أنواع الأعمال
app.get("/api/work_types", (req, res) => {
  db.all(`SELECT work_type, price FROM work_types`, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});
// نقطة النهاية للتحقق من وجود العميل في قاعدة البيانات
app.get("/check-customer", (req, res) => {
  const customerName = req.query.name;

  // استعلام للتحقق من وجود العميل
  db.get(`SELECT * FROM clients WHERE name = ?`, [customerName], (err, row) => {
    if (err) {
      console.error("خطأ أثناء التحقق من وجود العميل:", err);
      res.status(500).json({ exists: false });
    } else {
      // إرسال النتيجة
      res.json({ exists: !!row });
    }
  });
});
/*  ===================END PRODUCTS===============================
 */

/* ===================START BACKUP ON GOOGEL====================
                   النسخ الاحتياطي على قوقل
================================================================*/
/* const { OAuth2Client } = require("google-auth-library");
const CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID";
const client = new OAuth2Client(CLIENT_ID);
// app.use(express.json());
// API لتسجيل الدخول باستخدام Google
app.post("/api/google-login", async (req, res) => {
  const { credential } = req.body;

  try {
    // تحقق من الرمز المميز مع Google
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const email = payload.email;

    // تحقق من وجود المستخدم في قاعدة البيانات، أو أضفه إذا كان جديدًا
    db.get("SELECT * FROM users WHERE email = ?", [email], (err, user) => {
      if (err) {
        return res
          .status(500)
          .json({ success: false, message: "خطأ في قاعدة البيانات" });
      }

      if (!user) {
        // إذا كان المستخدم جديدًا، أضفه إلى قاعدة البيانات
        db.run("INSERT INTO users (email) VALUES (?)", [email], (err) => {
          if (err)
            return res
              .status(500)
              .json({ success: false, message: "خطأ في إضافة المستخدم" });
          res.json({ success: true });
        });
      } else {
        // المستخدم موجود مسبقًا، سجل دخوله
        res.json({ success: true });
      }
    });
  } catch (error) {
    console.error("Error verifying Google token:", error);
    res.status(401).json({ success: false, message: "فشل التحقق من الرمز" });
  }
}); */
//  ===================End BACKUP ON GOOGEL====================
/* ===============START add_delet The Employees================
   نقطة النهاية لإضافة موظف جديد               
================================================================*/
app.post("/api/employees", (req, res) => {
  const { name, position, salary } = req.body;
  if (!name || !position || salary == null) {
    return res
      .status(400)
      .json({ error: "يرجى تقديم اسم، وظيفة وراتب الموظف." });
  }

  db.run(
    `INSERT INTO employees (name, position, salary) VALUES (?, ?, ?)`,
    [name, position, salary],
    function (err) {
      if (err) return res.status(500).json({ error: "خطأ في إضافة الموظف." });
      res.json({ message: "تمت إضافة الموظف بنجاح.", id: this.lastID });
    }
  );
});
// نقطة النهاية لجلب قائمة الموظفين
app.get("/api/employees", (req, res) => {
  db.all(`SELECT * FROM employees`, (err, rows) => {
    if (err) return res.status(500).json({ error: "خطأ في جلب الموظفين." });
    res.json(rows);
  });
});
// نقطة النهاية لتعديل بيانات الموظف
app.get("/api/employees/:id", (req, res) => {
  const { id } = req.params;

  db.get(`SELECT * FROM employees WHERE id = ?`, [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: "خطأ في جلب بيانات الموظف." });
    }
    if (!row) {
      return res.status(404).json({ error: "الموظف غير موجود." });
    }
    res.json(row);
  });
});
// نقطة نهاية لجلب بيانات موظف معين
app.put("/api/employees/:id", (req, res) => {
  const { id } = req.params;
  const { name, position, salary } = req.body;

  if (!name || !position || salary == null) {
    return res
      .status(400)
      .json({ error: "يرجى تقديم اسم، وظيفة وراتب الموظف." });
  }

  db.run(
    `UPDATE employees SET name = ?, position = ?, salary = ? WHERE id = ?`,
    [name, position, salary, id],
    function (err) {
      if (err) return res.status(500).json({ error: "خطأ في تحديث الموظف." });
      if (this.changes === 0)
        return res.status(404).json({ error: "الموظف غير موجود." });
      res.json({ message: "تم تحديث الموظف بنجاح." });
    }
  );
});
// نقطة النهاية لحذف موظف
app.delete("/api/employees/:id", (req, res) => {
  const { id } = req.params;

  db.run(`DELETE FROM employees WHERE id = ?`, [id], function (err) {
    if (err) return res.status(500).json({ error: "خطأ في حذف الموظف." });
    if (this.changes === 0)
      return res.status(404).json({ error: "الموظف غير موجود." });
    res.json({ message: "تم حذف الموظف بنجاح." });
  });
});
//  ====================================END The Employees================
/* ===============START TRANSACTIONS The Employees================
             ادارة حسابات الموظفين  
================================================================*/
// نقطة النهاية لجلب أسماء الموظفين (الإكمال التلقائي)
app.get("/api/get-employees", (req, res) => {
  const query = `SELECT name FROM employees`;
  db.all(query, [], (err, rows) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "حدث خطأ أثناء جلب أسماء الموظفين" });
    }
    const employeeNames = rows.map((row) => row.name);
    res.json(employeeNames);
  });
});
app.post("/api/financial-transactions", (req, res) => {
  const { employeeName, type, amount, details } = req.body;
  const date = new Date().toISOString().split("T")[0];

  // التأكد من وجود جميع البيانات المطلوبة
  if (!employeeName || !type || amount == null) {
    return res
      .status(400)
      .json({ error: "يرجى تقديم جميع المعلومات المطلوبة." });
  }

  // البحث عن الموظف بواسطة اسمه للحصول على ID الخاص به
  db.get(
    `SELECT id FROM employees WHERE name = ?`,
    [employeeName],
    (err, row) => {
      if (err) {
        return res
          .status(500)
          .json({ error: "خطأ في استعلام قاعدة البيانات." });
      }

      if (!row) {
        return res.status(404).json({ error: "الموظف غير موجود." });
      }

      const employeeId = row.id;

      // إدخال العملية المالية في جدول العمليات المالية باستخدام employee_id
      db.run(
        `INSERT INTO employee_transactions (employee_id, type, amount, details, date) VALUES (?, ?, ?, ?, ?)`,
        [employeeId, type, amount, details, date],
        function (err) {
          if (err)
            return res
              .status(500)
              .json({ error: "خطأ في إضافة العملية المالية." });
          res.json({ message: "تمت إضافة العملية بنجاح." });
        }
      );
    }
  );
});
//===============END TRANSACTIONS The Employees================

/* ===============START SEARCH The Employees================
           كشوفات  الموظفين  
================================================================*/
// نقطة نهاية للبحث عن العمليات المالية للموظف بناءً على اسمه
app.get("/api/financial-transactions/:employeeName", (req, res) => {
  const employeeName = req.params.employeeName;

  const query = `
        SELECT 
            e.salary AS baseSalary,
            t.type AS type,
            t.amount AS amount,
            t.details AS details,
            t.date AS date,
            t.id AS transactionId
        FROM 
            employees e
        LEFT JOIN 
            employee_transactions t 
        ON 
            e.id = t.employee_id
        WHERE 
            e.name = ?
    `;

  db.all(query, [employeeName], (err, rows) => {
    if (err) {
      console.error("Error fetching financial transactions:", err);
      res.status(500).send("Error fetching financial transactions.");
      return;
    }

    if (rows.length === 0) {
      res.status(404).send("Employee not found.");
      return;
    }

    const baseSalary = rows[0].baseSalary || 0; // استخراج الراتب الأساسي
    const transactions = rows
      .filter((row) => row.transactionId) // تجاهل الصفوف التي لا تحتوي على عمليات
      .map((row) => ({
        id: row.transactionId,
        type: row.type,
        amount: row.amount,
        details: row.details,
        date: row.date,
      }));

    res.json({ baseSalary, transactions });
  });
});
// // نقطة النهاية لحذف العملية
app.delete("/api/financial-transactions/:id", (req, res) => {
  const transactionId = req.params.id;

  db.run(
    "DELETE FROM employee_transactions WHERE id = ?",
    [transactionId],
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "حدث خطأ أثناء حذف العملية." });
      }

      if (this.changes === 0) {
        return res.status(404).json({ message: "العملية غير موجودة." });
      }

      res.json({ message: "تم حذف العملية بنجاح." });
    }
  );
});
// نقطة النهاية لتعديل العملية
app.put("/api/financial-transactions/:id", (req, res) => {
  const transactionId = req.params.id;
  const { amount, details } = req.body;

  // التحقق من البيانات
  if (!amount || isNaN(amount)) {
    return res.status(400).json({ message: "المبلغ غير صالح." });
  }

  db.run(
    "UPDATE employee_transactions SET amount = ?, details = ? WHERE id = ?",
    [amount, details || null, transactionId],
    function (err) {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .json({ message: "حدث خطأ أثناء تعديل العملية." });
      }

      if (this.changes === 0) {
        return res.status(404).json({ message: "العملية غير موجودة." });
      }

      res.json({ message: "تم تعديل العملية بنجاح." });
    }
  );
});
// ======================================

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
// ======================
// بدء السيرفر
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
