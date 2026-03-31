export const CREATE_TABLES = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    tier TEXT DEFAULT 'free',
    tier_expires_at INTEGER,
    trial_started_at INTEGER,
    trial_expires_at INTEGER,
    fcm_token TEXT,
    assistant_level TEXT DEFAULT 'normal',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    platform_order_id TEXT,
    status TEXT DEFAULT 'active',
    pool TEXT DEFAULT 'active',
    client_name TEXT NOT NULL,
    client_email TEXT,
    client_phone TEXT,
    client_address TEXT,
    client_country TEXT,
    client_ig TEXT,
    project_title TEXT NOT NULL,
    project_description TEXT,
    project_goal TEXT,
    budget REAL,
    currency TEXT DEFAULT 'IDR',
    deadline INTEGER,
    started_at INTEGER,
    completed_at INTEGER,
    paused_at INTEGER,
    progress_pct INTEGER DEFAULT 0,
    priority INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    revision_count INTEGER DEFAULT 0,
    tags_json TEXT DEFAULT '[]',
    vault_folder_id TEXT,
    is_focus_active INTEGER DEFAULT 0,
    focus_activated_at INTEGER,
    last_activity_at INTEGER,
    expiry_notif_sent INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    synced_at INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS task_notes (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(id)
  );

  CREATE TABLE IF NOT EXISTS focus_sessions (
    id TEXT PRIMARY KEY,
    task_id TEXT,
    user_id TEXT NOT NULL,
    duration_type TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    actual_minutes INTEGER NOT NULL,
    completed INTEGER DEFAULT 0,
    spotify_track_id TEXT,
    started_at INTEGER NOT NULL,
    ended_at INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS vault_folders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    task_id TEXT,
    name TEXT NOT NULL,
    tags_json TEXT DEFAULT '[]',
    sort_order INTEGER DEFAULT 0,
    archived_at INTEGER,
    drive_folder_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS vault_files (
    id TEXT PRIMARY KEY,
    folder_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    local_path TEXT,
    remote_url TEXT,
    file_size_bytes INTEGER,
    width_px INTEGER,
    height_px INTEGER,
    thumbnail_path TEXT,
    is_pinned INTEGER DEFAULT 0,
    source_folder_id TEXT,
    drive_file_id TEXT,
    created_at INTEGER NOT NULL,
    synced_at INTEGER,
    FOREIGN KEY (folder_id) REFERENCES vault_folders(id)
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    task_id TEXT,
    invoice_number TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'draft',
    client_name TEXT NOT NULL,
    client_email TEXT NOT NULL,
    client_phone TEXT,
    client_address TEXT,
    client_country TEXT,
    items_json TEXT NOT NULL,
    subtotal REAL NOT NULL,
    tax_pct REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    total REAL NOT NULL,
    currency TEXT DEFAULT 'IDR',
    due_date INTEGER NOT NULL,
    notes TEXT,
    language TEXT DEFAULT 'id',
    payment_methods_json TEXT DEFAULT '[]',
    delivery_channels_json TEXT DEFAULT '[]',
    has_watermark INTEGER DEFAULT 1,
    paypal_invoice_id TEXT,
    public_link_token TEXT,
    pdf_local_path TEXT,
    pdf_remote_url TEXT,
    sent_at INTEGER,
    paid_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    source TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    raw_email_id TEXT,
    related_task_id TEXT,
    related_invoice_id TEXT,
    is_read INTEGER DEFAULT 0,
    action_taken TEXT,
    scheduled_for INTEGER,
    received_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS achievements (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    achievement_key TEXT NOT NULL,
    achieved_at INTEGER NOT NULL,
    value_at_time REAL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS sync_queue (
    id TEXT PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    payload TEXT NOT NULL,
    attempts INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_settings (
    user_id TEXT PRIMARY KEY,
    default_currency TEXT DEFAULT 'IDR',
    notes_template TEXT,
    bank1_name TEXT,
    bank1_account TEXT,
    bank1_holder TEXT,
    bank2_name TEXT,
    bank2_account TEXT,
    bank2_holder TEXT,
    qris_image_path TEXT,
    qris_image_url TEXT,
    paypal_email TEXT,
    wa_number TEXT,
    sender_email TEXT,
    daily_focus_target_minutes INTEGER DEFAULT 360,
    focus_duration_default TEXT DEFAULT 'pomodoro_25',
    spotify_connected INTEGER DEFAULT 0,
    spotify_token_json TEXT,
    gmail_connected INTEGER DEFAULT 0,
    gmail_token_json TEXT,
    gdrive_connected INTEGER DEFAULT 0,
    gdrive_token_json TEXT,
    assistant_level TEXT DEFAULT 'normal',
    notif_parse_interval_min INTEGER DEFAULT 15,
    dual_panel_enabled INTEGER DEFAULT 0,
    last_sync_at INTEGER,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`;