import { MigrationInterface, QueryRunner } from 'typeorm';

export class TelemetrySchema1746400000000 implements MigrationInterface {
  name = 'TelemetrySchema1746400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Core events table
    await queryRunner.query(`
      CREATE TABLE funnel_events (
        id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id       UUID        NOT NULL,
        session_id    UUID        NOT NULL,
        event_name    VARCHAR(100) NOT NULL,
        properties    JSONB        NOT NULL DEFAULT '{}',
        platform      VARCHAR(50),
        device        VARCHAR(100),
        race          VARCHAR(50),
        era           INT,
        occurred_at   TIMESTAMPTZ NOT NULL,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_fe_user_id       ON funnel_events (user_id)`);
    await queryRunner.query(`CREATE INDEX idx_fe_session_id    ON funnel_events (session_id)`);
    await queryRunner.query(`CREATE INDEX idx_fe_event_name    ON funnel_events (event_name)`);
    await queryRunner.query(`CREATE INDEX idx_fe_occurred_at   ON funnel_events (occurred_at DESC)`);
    await queryRunner.query(`CREATE INDEX idx_fe_user_event    ON funnel_events (user_id, event_name, occurred_at DESC)`);

    // ── D1/D7/D30 cohort retention view ──────────────────────────────────────
    // Registration day = first session_start per user.
    // A user is "retained" on day N if they have any event on that calendar day.
    await queryRunner.query(`
      CREATE VIEW v_cohort_retention AS
      WITH registrations AS (
        SELECT
          user_id,
          DATE(MIN(occurred_at)) AS reg_date
        FROM funnel_events
        WHERE event_name = 'session_start'
        GROUP BY user_id
      ),
      daily_activity AS (
        SELECT DISTINCT
          fe.user_id,
          DATE(fe.occurred_at) AS active_date
        FROM funnel_events fe
      ),
      cohort_activity AS (
        SELECT
          r.reg_date                                          AS cohort_date,
          da.active_date - r.reg_date                        AS day_number,
          COUNT(DISTINCT da.user_id)                         AS active_users
        FROM registrations r
        JOIN daily_activity da ON da.user_id = r.user_id
        GROUP BY r.reg_date, day_number
      ),
      cohort_sizes AS (
        SELECT reg_date, COUNT(DISTINCT user_id) AS cohort_size
        FROM registrations
        GROUP BY reg_date
      )
      SELECT
        ca.cohort_date,
        cs.cohort_size,
        ca.day_number,
        ca.active_users,
        ROUND(ca.active_users::NUMERIC / NULLIF(cs.cohort_size, 0) * 100, 2) AS retention_pct
      FROM cohort_activity ca
      JOIN cohort_sizes cs ON cs.reg_date = ca.cohort_date
      WHERE ca.day_number IN (0, 1, 7, 30)
      ORDER BY ca.cohort_date DESC, ca.day_number
    `);

    // ── Onboarding funnel completion rate view ────────────────────────────────
    await queryRunner.query(`
      CREATE VIEW v_onboarding_funnel AS
      WITH steps AS (
        SELECT UNNEST(ARRAY['race_select','base_view','first_battle']) AS step, UNNEST(ARRAY[1,2,3]) AS step_order
      ),
      step_starts AS (
        SELECT
          (properties->>'step') AS step,
          COUNT(DISTINCT user_id) AS started
        FROM funnel_events
        WHERE event_name = 'onboarding_step_view'
          AND properties->>'step' IS NOT NULL
        GROUP BY properties->>'step'
      ),
      step_completes AS (
        SELECT
          (properties->>'step') AS step,
          COUNT(DISTINCT user_id) AS completed,
          ROUND(AVG((properties->>'time_spent_sec')::NUMERIC), 2) AS avg_time_spent_sec
        FROM funnel_events
        WHERE event_name = 'onboarding_step_complete'
          AND properties->>'step' IS NOT NULL
        GROUP BY properties->>'step'
      )
      SELECT
        s.step_order,
        s.step,
        COALESCE(ss.started, 0)   AS started,
        COALESCE(sc.completed, 0) AS completed,
        COALESCE(sc.avg_time_spent_sec, 0) AS avg_time_spent_sec,
        CASE
          WHEN COALESCE(ss.started, 0) = 0 THEN 0
          ELSE ROUND(COALESCE(sc.completed, 0)::NUMERIC / ss.started * 100, 2)
        END AS completion_pct
      FROM steps s
      LEFT JOIN step_starts   ss ON ss.step = s.step
      LEFT JOIN step_completes sc ON sc.step = s.step
      ORDER BY s.step_order
    `);

    // ── Battle load time percentiles view ─────────────────────────────────────
    await queryRunner.query(`
      CREATE VIEW v_battle_load_times AS
      SELECT
        DATE_TRUNC('day', occurred_at)                                                     AS day,
        COUNT(*)                                                                            AS sample_count,
        ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY (properties->>'duration_ms')::NUMERIC)) AS p50_ms,
        ROUND(PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY (properties->>'duration_ms')::NUMERIC)) AS p90_ms,
        ROUND(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY (properties->>'duration_ms')::NUMERIC)) AS p99_ms
      FROM funnel_events
      WHERE event_name = 'battle_load_complete'
        AND properties->>'duration_ms' IS NOT NULL
      GROUP BY DATE_TRUNC('day', occurred_at)
      ORDER BY day DESC
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP VIEW IF EXISTS v_battle_load_times`);
    await queryRunner.query(`DROP VIEW IF EXISTS v_onboarding_funnel`);
    await queryRunner.query(`DROP VIEW IF EXISTS v_cohort_retention`);
    await queryRunner.query(`DROP TABLE IF EXISTS funnel_events`);
  }
}
