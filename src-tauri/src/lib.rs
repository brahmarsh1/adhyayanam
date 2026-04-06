use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{Manager, State};

pub struct DbState(pub Mutex<Connection>);

// ── Types ──

#[derive(Debug, Serialize, Deserialize)]
pub struct Veda {
    pub id: i64,
    pub name: String,
    pub name_devanagari: String,
    pub name_display: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Division {
    pub id: i64,
    pub veda_id: i64,
    pub number: i64,
    pub name: String,
    pub name_devanagari: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Subdivision {
    pub id: i64,
    pub division_id: i64,
    pub number: i64,
    pub name: Option<String>,
    pub rishi: Option<String>,
    pub devata: Option<String>,
    pub chandas: Option<String>,
    pub verse_count: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Verse {
    pub id: i64,
    pub veda_id: i64,
    pub subdivision_id: i64,
    pub verse_number: i64,
    pub reference: String,
    pub text_devanagari: String,
    pub text_baraha: Option<String>,
    pub padapatha_devanagari: Option<String>,
    pub padapatha_baraha: Option<String>,
    pub kramapatha_devanagari: Option<String>,
    pub kramapatha_baraha: Option<String>,
    pub jatapatha_devanagari: Option<String>,
    pub jatapatha_baraha: Option<String>,
    pub ghanapatha_devanagari: Option<String>,
    pub ghanapatha_baraha: Option<String>,
    pub rishi: Option<String>,
    pub devata: Option<String>,
    pub chandas: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SrsCard {
    pub id: i64,
    pub verse_id: i64,
    pub drill_mode: String,
    pub ease_factor: f64,
    pub interval_days: i64,
    pub repetitions: i64,
    pub next_review_date: String,
    pub last_review_date: Option<String>,
    pub total_reviews: i64,
    pub correct_reviews: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StudyCard {
    pub card: SrsCard,
    pub verse: Verse,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SrsUpdate {
    pub ease_factor: f64,
    pub interval_days: i64,
    pub repetitions: i64,
    pub next_review_date: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DashboardStats {
    pub due_today: i64,
    pub reviewed_today: i64,
    pub new_available: i64,
    pub total_verses: i64,
    pub mature_count: i64,
    pub learning_count: i64,
    pub accuracy_7d: f64,
    pub current_streak: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WordAnnotation {
    pub position: i64,
    pub word: String,
    pub lemma: Option<String>,
    pub verbal_root: Option<String>,
    pub pos: Option<String>,
}

// ── SM-2 Algorithm ──

fn sm2(quality: i32, repetitions: i64, ease_factor: f64, interval_days: i64) -> SrsUpdate {
    let today = chrono_today();

    if quality < 3 {
        // Lapse: reset
        return SrsUpdate {
            ease_factor: (ease_factor - 0.2_f64).max(1.3),
            interval_days: 1,
            repetitions: 0,
            next_review_date: add_days(&today, 1),
        };
    }

    let q = quality as f64;
    let new_ef = (ease_factor + 0.1 - (5.0 - q) * (0.08 + (5.0 - q) * 0.02)).max(1.3);

    let new_interval = match repetitions {
        0 => 1,
        1 => 6,
        _ => ((interval_days as f64) * new_ef).round() as i64,
    };

    SrsUpdate {
        ease_factor: new_ef,
        interval_days: new_interval,
        repetitions: repetitions + 1,
        next_review_date: add_days(&today, new_interval),
    }
}

fn chrono_today() -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    let days = now / 86400;
    let y = 1970 + (days * 400 / 146097);
    // Simple ISO date - use the system
    let output = std::process::Command::new("date")
        .args(["+%Y-%m-%d"])
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_else(|_| "2026-01-01".to_string());
    let _ = y; // suppress unused
    output
}

fn add_days(date_str: &str, days: i64) -> String {
    // Parse YYYY-MM-DD, add days naively
    let parts: Vec<i32> = date_str.split('-').filter_map(|s| s.parse().ok()).collect();
    if parts.len() != 3 {
        return date_str.to_string();
    }
    // Use Julian Day Number for arithmetic
    let (y, m, d) = (parts[0], parts[1], parts[2]);
    let jdn = to_jdn(y, m, d) + days as i32;
    from_jdn(jdn)
}

fn to_jdn(y: i32, m: i32, d: i32) -> i32 {
    let a = (14 - m) / 12;
    let y2 = y + 4800 - a;
    let m2 = m + 12 * a - 3;
    d + (153 * m2 + 2) / 5 + 365 * y2 + y2 / 4 - y2 / 100 + y2 / 400 - 32045
}

fn from_jdn(jdn: i32) -> String {
    let a = jdn + 32044;
    let b = (4 * a + 3) / 146097;
    let c = a - (146097 * b) / 4;
    let d = (4 * c + 3) / 1461;
    let e = c - (1461 * d) / 4;
    let m = (5 * e + 2) / 153;
    let day = e - (153 * m + 2) / 5 + 1;
    let month = m + 3 - 12 * (m / 10);
    let year = 100 * b + d - 4800 + m / 10;
    format!("{:04}-{:02}-{:02}", year, month, day)
}

// ── Tauri Commands: Corpus ──

#[tauri::command]
fn get_vedas(db: State<DbState>) -> Result<Vec<Veda>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, name_devanagari, name_display FROM vedas ORDER BY id")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(Veda {
                id: row.get(0)?,
                name: row.get(1)?,
                name_devanagari: row.get(2)?,
                name_display: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
fn get_divisions(db: State<DbState>, veda_id: i64) -> Result<Vec<Division>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, veda_id, number, name, name_devanagari FROM divisions WHERE veda_id = ?1 ORDER BY number")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([veda_id], |row| {
            Ok(Division {
                id: row.get(0)?,
                veda_id: row.get(1)?,
                number: row.get(2)?,
                name: row.get(3)?,
                name_devanagari: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
fn get_subdivisions(db: State<DbState>, division_id: i64) -> Result<Vec<Subdivision>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT s.id, s.division_id, s.number, s.name, s.rishi, s.devata, s.chandas,
                    (SELECT COUNT(*) FROM verses v WHERE v.subdivision_id = s.id) as verse_count
             FROM subdivisions s WHERE s.division_id = ?1 ORDER BY s.number"
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([division_id], |row| {
            Ok(Subdivision {
                id: row.get(0)?,
                division_id: row.get(1)?,
                number: row.get(2)?,
                name: row.get(3)?,
                rishi: row.get(4)?,
                devata: row.get(5)?,
                chandas: row.get(6)?,
                verse_count: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
fn get_verses(db: State<DbState>, subdivision_id: i64) -> Result<Vec<Verse>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, veda_id, subdivision_id, verse_number, reference,
                    text_devanagari, text_baraha, padapatha_devanagari, padapatha_baraha,
                    kramapatha_devanagari, kramapatha_baraha,
                    jatapatha_devanagari, jatapatha_baraha,
                    ghanapatha_devanagari, ghanapatha_baraha,
                    rishi, devata, chandas
             FROM verses WHERE subdivision_id = ?1 ORDER BY verse_number"
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([subdivision_id], |row| {
            Ok(Verse {
                id: row.get(0)?,
                veda_id: row.get(1)?,
                subdivision_id: row.get(2)?,
                verse_number: row.get(3)?,
                reference: row.get(4)?,
                text_devanagari: row.get(5)?,
                text_baraha: row.get(6)?,
                padapatha_devanagari: row.get(7)?,
                padapatha_baraha: row.get(8)?,
                kramapatha_devanagari: row.get(9)?,
                kramapatha_baraha: row.get(10)?,
                jatapatha_devanagari: row.get(11)?,
                jatapatha_baraha: row.get(12)?,
                ghanapatha_devanagari: row.get(13)?,
                ghanapatha_baraha: row.get(14)?,
                rishi: row.get(15)?,
                devata: row.get(16)?,
                chandas: row.get(17)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
fn get_verse(db: State<DbState>, verse_id: i64) -> Result<Verse, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.query_row(
        "SELECT id, veda_id, subdivision_id, verse_number, reference,
                text_devanagari, text_baraha, padapatha_devanagari, padapatha_baraha,
                kramapatha_devanagari, kramapatha_baraha,
                jatapatha_devanagari, jatapatha_baraha,
                ghanapatha_devanagari, ghanapatha_baraha,
                rishi, devata, chandas
         FROM verses WHERE id = ?1",
        [verse_id],
        |row| {
            Ok(Verse {
                id: row.get(0)?,
                veda_id: row.get(1)?,
                subdivision_id: row.get(2)?,
                verse_number: row.get(3)?,
                reference: row.get(4)?,
                text_devanagari: row.get(5)?,
                text_baraha: row.get(6)?,
                padapatha_devanagari: row.get(7)?,
                padapatha_baraha: row.get(8)?,
                kramapatha_devanagari: row.get(9)?,
                kramapatha_baraha: row.get(10)?,
                jatapatha_devanagari: row.get(11)?,
                jatapatha_baraha: row.get(12)?,
                ghanapatha_devanagari: row.get(13)?,
                ghanapatha_baraha: row.get(14)?,
                rishi: row.get(15)?,
                devata: row.get(16)?,
                chandas: row.get(17)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_word_annotations(db: State<DbState>, verse_id: i64) -> Result<Vec<WordAnnotation>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT position, word, lemma, verbal_root, pos
             FROM word_annotations WHERE verse_id = ?1 ORDER BY position"
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([verse_id], |row| {
            Ok(WordAnnotation {
                position: row.get(0)?,
                word: row.get(1)?,
                lemma: row.get(2)?,
                verbal_root: row.get(3)?,
                pos: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

// ── Tauri Commands: SRS ──

#[tauri::command]
fn get_due_cards(db: State<DbState>, limit: i64, drill_modes: Vec<String>) -> Result<Vec<StudyCard>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let today = chrono_today();
    let modes_str = drill_modes.iter().map(|m| format!("'{}'", m)).collect::<Vec<_>>().join(",");
    let sql = format!(
        "SELECT c.id, c.verse_id, c.drill_mode, c.ease_factor, c.interval_days, c.repetitions,
                c.next_review_date, c.last_review_date, c.total_reviews, c.correct_reviews,
                v.id, v.veda_id, v.subdivision_id, v.verse_number, v.reference,
                v.text_devanagari, v.text_baraha, v.padapatha_devanagari, v.padapatha_baraha,
                v.kramapatha_devanagari, v.kramapatha_baraha,
                v.jatapatha_devanagari, v.jatapatha_baraha,
                v.ghanapatha_devanagari, v.ghanapatha_baraha,
                v.rishi, v.devata, v.chandas
         FROM srs_cards c JOIN verses v ON c.verse_id = v.id
         WHERE c.next_review_date <= ?1 AND c.drill_mode IN ({})
         ORDER BY c.next_review_date ASC, c.ease_factor ASC
         LIMIT ?2",
        modes_str
    );
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(rusqlite::params![today, limit], |row| {
            Ok(StudyCard {
                card: SrsCard {
                    id: row.get(0)?,
                    verse_id: row.get(1)?,
                    drill_mode: row.get(2)?,
                    ease_factor: row.get(3)?,
                    interval_days: row.get(4)?,
                    repetitions: row.get(5)?,
                    next_review_date: row.get(6)?,
                    last_review_date: row.get(7)?,
                    total_reviews: row.get(8)?,
                    correct_reviews: row.get(9)?,
                },
                verse: Verse {
                    id: row.get(10)?,
                    veda_id: row.get(11)?,
                    subdivision_id: row.get(12)?,
                    verse_number: row.get(13)?,
                    reference: row.get(14)?,
                    text_devanagari: row.get(15)?,
                    text_baraha: row.get(16)?,
                    padapatha_devanagari: row.get(17)?,
                    padapatha_baraha: row.get(18)?,
                    kramapatha_devanagari: row.get(19)?,
                    kramapatha_baraha: row.get(20)?,
                    jatapatha_devanagari: row.get(21)?,
                    jatapatha_baraha: row.get(22)?,
                    ghanapatha_devanagari: row.get(23)?,
                    ghanapatha_baraha: row.get(24)?,
                    rishi: row.get(25)?,
                    devata: row.get(26)?,
                    chandas: row.get(27)?,
                },
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
fn add_verses_to_study(db: State<DbState>, subdivision_id: i64, drill_modes: Vec<String>) -> Result<i64, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let today = chrono_today();
    let mut count = 0i64;
    let mut stmt = conn
        .prepare("SELECT id FROM verses WHERE subdivision_id = ?1 ORDER BY verse_number")
        .map_err(|e| e.to_string())?;
    let verse_ids: Vec<i64> = stmt
        .query_map([subdivision_id], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    for verse_id in verse_ids {
        for mode in &drill_modes {
            let result = conn.execute(
                "INSERT OR IGNORE INTO srs_cards (verse_id, drill_mode, ease_factor, interval_days, repetitions, next_review_date, total_reviews, correct_reviews)
                 VALUES (?1, ?2, 2.5, 0, 0, ?3, 0, 0)",
                rusqlite::params![verse_id, mode, today],
            );
            if let Ok(n) = result {
                count += n as i64;
            }
        }
    }
    Ok(count)
}

#[tauri::command]
fn submit_review(db: State<DbState>, card_id: i64, quality: i32) -> Result<SrsUpdate, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let today = chrono_today();

    // Get current card state
    let (repetitions, ease_factor, interval_days): (i64, f64, i64) = conn
        .query_row(
            "SELECT repetitions, ease_factor, interval_days FROM srs_cards WHERE id = ?1",
            [card_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .map_err(|e| e.to_string())?;

    let update = sm2(quality, repetitions, ease_factor, interval_days);

    conn.execute(
        "UPDATE srs_cards SET ease_factor = ?1, interval_days = ?2, repetitions = ?3,
         next_review_date = ?4, last_review_date = ?5,
         total_reviews = total_reviews + 1,
         correct_reviews = correct_reviews + CASE WHEN ?6 >= 3 THEN 1 ELSE 0 END
         WHERE id = ?7",
        rusqlite::params![
            update.ease_factor,
            update.interval_days,
            update.repetitions,
            update.next_review_date,
            today,
            quality,
            card_id
        ],
    )
    .map_err(|e| e.to_string())?;

    // Update daily stats
    conn.execute(
        "INSERT INTO daily_stats (date, reviews_completed, new_cards_studied, correct_count, total_count)
         VALUES (?1, 1, 0, CASE WHEN ?2 >= 3 THEN 1 ELSE 0 END, 1)
         ON CONFLICT(date) DO UPDATE SET
           reviews_completed = reviews_completed + 1,
           correct_count = correct_count + CASE WHEN ?2 >= 3 THEN 1 ELSE 0 END,
           total_count = total_count + 1",
        rusqlite::params![today, quality],
    )
    .map_err(|e| e.to_string())?;

    Ok(update)
}

#[tauri::command]
fn get_dashboard_stats(db: State<DbState>) -> Result<DashboardStats, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let today = chrono_today();

    let due_today: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM srs_cards WHERE next_review_date <= ?1",
            [&today],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let reviewed_today: i64 = conn
        .query_row(
            "SELECT COALESCE(SUM(reviews_completed), 0) FROM daily_stats WHERE date = ?1",
            [&today],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let total_verses: i64 = conn
        .query_row("SELECT COUNT(*) FROM verses", [], |row| row.get(0))
        .unwrap_or(0);

    let mature_count: i64 = conn
        .query_row(
            "SELECT COUNT(DISTINCT verse_id) FROM srs_cards WHERE interval_days >= 21",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let learning_count: i64 = conn
        .query_row(
            "SELECT COUNT(DISTINCT verse_id) FROM srs_cards WHERE interval_days > 0 AND interval_days < 21",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let new_available: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM verses v WHERE NOT EXISTS (SELECT 1 FROM srs_cards c WHERE c.verse_id = v.id)",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    // 7-day accuracy
    let seven_days_ago = add_days(&today, -7);
    let (correct_7d, total_7d): (i64, i64) = conn
        .query_row(
            "SELECT COALESCE(SUM(correct_count), 0), COALESCE(SUM(total_count), 0)
             FROM daily_stats WHERE date >= ?1",
            [&seven_days_ago],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .unwrap_or((0, 0));
    let accuracy_7d = if total_7d > 0 {
        correct_7d as f64 / total_7d as f64
    } else {
        0.0
    };

    // Streak
    let mut current_streak: i64 = 0;
    let mut check_date = today.clone();
    loop {
        let count: i64 = conn
            .query_row(
                "SELECT COALESCE(reviews_completed, 0) FROM daily_stats WHERE date = ?1",
                [&check_date],
                |row| row.get(0),
            )
            .unwrap_or(0);
        if count > 0 {
            current_streak += 1;
            check_date = add_days(&check_date, -1);
        } else {
            break;
        }
    }

    Ok(DashboardStats {
        due_today,
        reviewed_today,
        new_available,
        total_verses,
        mature_count,
        learning_count,
        accuracy_7d,
        current_streak,
    })
}

#[tauri::command]
fn get_setting(db: State<DbState>, key: String) -> Result<Option<String>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.query_row(
        "SELECT value FROM settings WHERE key = ?1",
        [&key],
        |row| row.get(0),
    )
    .optional()
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn set_setting(db: State<DbState>, key: String, value: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
        rusqlite::params![key, value],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

// ── App Setup ──

fn init_db(app_dir: &std::path::Path) -> Result<Connection, Box<dyn std::error::Error>> {
    let db_path = app_dir.join("adhyayanam.db");

    // If DB doesn't exist, try to copy from project root (dev) or bundled resource
    if !db_path.exists() {
        // Dev mode: look in project root (two levels up from src-tauri)
        let dev_db = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .map(|p| p.join("adhyayanam.db"));
        if let Some(ref dev_path) = dev_db {
            if dev_path.exists() {
                log::info!("Copying dev database from {:?}", dev_path);
                std::fs::copy(dev_path, &db_path)?;
            }
        }
    }

    let conn = Connection::open(&db_path)?;
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;

    // Ensure schema exists (idempotent)
    conn.execute_batch(include_str!("../migrations/001_initial_schema.sql"))?;

    // Insert default settings if empty
    conn.execute(
        "INSERT OR IGNORE INTO settings (key, value) VALUES ('new_cards_per_day', '5')",
        [],
    )?;
    conn.execute(
        "INSERT OR IGNORE INTO settings (key, value) VALUES ('max_reviews_per_day', '100')",
        [],
    )?;
    conn.execute(
        "INSERT OR IGNORE INTO settings (key, value) VALUES ('display_script', 'both')",
        [],
    )?;
    conn.execute(
        "INSERT OR IGNORE INTO settings (key, value) VALUES ('font_size', '20')",
        [],
    )?;

    Ok(conn)
}

use rusqlite::OptionalExtension;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Get app data dir
            let app_dir = app
                .path()
                .app_data_dir()
                .expect("failed to get app data dir");
            std::fs::create_dir_all(&app_dir)?;

            let conn = init_db(&app_dir).expect("failed to initialize database");
            app.manage(DbState(Mutex::new(conn)));

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_vedas,
            get_divisions,
            get_subdivisions,
            get_verses,
            get_verse,
            get_word_annotations,
            get_due_cards,
            add_verses_to_study,
            submit_review,
            get_dashboard_stats,
            get_setting,
            set_setting,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
