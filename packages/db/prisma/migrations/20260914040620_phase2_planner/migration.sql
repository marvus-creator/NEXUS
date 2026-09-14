-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'DOING', 'DONE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "Recurrence" AS ENUM ('NONE', 'DAILY', 'WEEKDAYS', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'ACHIEVED', 'PAUSED', 'DROPPED');

-- CreateEnum
CREATE TYPE "GoalHorizon" AS ENUM ('SHORT', 'LONG');

-- CreateEnum
CREATE TYPE "EventKind" AS ENUM ('PERSONAL', 'STUDY', 'TASK', 'FIXED');

-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('IMPORTANT', 'SOCIAL', 'EVENTS', 'LEARNING', 'GOALS', 'DISCOVER', 'SYSTEM');

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "area" "GoalArea" NOT NULL DEFAULT 'PERSONAL',
    "horizon" "GoalHorizon" NOT NULL DEFAULT 'SHORT',
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "target_date" TIMESTAMP(3),
    "achieved_at" TIMESTAMP(3),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestones" (
    "id" TEXT NOT NULL,
    "goal_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "done_at" TIMESTAMP(3),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "goal_id" TEXT,
    "parent_id" TEXT,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "category" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "due_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "recurrence" "Recurrence" NOT NULL DEFAULT 'NONE',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_events" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "task_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "kind" "EventKind" NOT NULL DEFAULT 'PERSONAL',
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "all_day" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "category" "NotificationCategory" NOT NULL DEFAULT 'SYSTEM',
    "title" TEXT NOT NULL,
    "body" TEXT,
    "href" TEXT,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "important_in_app" BOOLEAN NOT NULL DEFAULT true,
    "social_in_app" BOOLEAN NOT NULL DEFAULT true,
    "events_in_app" BOOLEAN NOT NULL DEFAULT true,
    "learning_in_app" BOOLEAN NOT NULL DEFAULT true,
    "goals_in_app" BOOLEAN NOT NULL DEFAULT true,
    "discover_in_app" BOOLEAN NOT NULL DEFAULT true,
    "system_in_app" BOOLEAN NOT NULL DEFAULT true,
    "email_digest" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "goals_profile_id_status_idx" ON "goals"("profile_id", "status");

-- CreateIndex
CREATE INDEX "milestones_goal_id_idx" ON "milestones"("goal_id");

-- CreateIndex
CREATE INDEX "tasks_profile_id_status_due_at_idx" ON "tasks"("profile_id", "status", "due_at");

-- CreateIndex
CREATE INDEX "tasks_goal_id_idx" ON "tasks"("goal_id");

-- CreateIndex
CREATE INDEX "tasks_parent_id_idx" ON "tasks"("parent_id");

-- CreateIndex
CREATE INDEX "calendar_events_profile_id_start_at_idx" ON "calendar_events"("profile_id", "start_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_created_at_idx" ON "notifications"("user_id", "read_at", "created_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_category_idx" ON "notifications"("user_id", "category");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_id_key" ON "notification_preferences"("user_id");

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
