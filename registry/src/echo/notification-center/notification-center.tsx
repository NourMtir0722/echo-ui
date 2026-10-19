"use client";

/**
 * NotificationCenter. An inbox of what happened: a bell key with the unread
 * count on it, opening a panel of notifications, newest first. Unread ones
 * carry a lit LED; opening one marks it read; "Mark all read" clears them.
 * It's where a toast goes after it has gone: a person who missed it finds it
 * here.
 *
 * The bell is a real button named with the count ("Notifications, 3
 * unread"); the panel is a Popover with a heading and a list of Items.
 */
import type { ReactNode } from "react";
import { HardwareButton } from "../hardware-button";
import { Popover } from "../popover";
import { CountBadge } from "../count-badge";
import { Item } from "../item";
import "./notification-center.css";

export interface Notification {
  id: string;
  title: string;
  body?: ReactNode;
  /** When, as you want it shown: "2m", "Mon". */
  time?: string;
  read?: boolean;
  /** Where opening it goes. */
  href?: string;
}

export interface NotificationCenterProps {
  notifications: Notification[];
  /** Called when one is opened. Mark it read here. */
  onOpen?: (id: string) => void;
  /** Called by "Mark all read". */
  onReadAll?: () => void;
  /** What an empty inbox says. Default "Nothing new." */
  emptyText?: ReactNode;
}

const Bell = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 11V7a4 4 0 0 1 8 0v4l1.2 1.5H2.8zM6.5 14h3" />
  </svg>
);

export function NotificationCenter({ notifications, onOpen, onReadAll, emptyText = "Nothing new." }: NotificationCenterProps) {
  const unread = notifications.filter((n) => !n.read).length;
  const name = unread ? `Notifications, ${unread} unread` : "Notifications";
  return (
    <span className="echo-notifications">
      <Popover
        side="bottom"
        align="end"
        title="Notifications"
        trigger={<HardwareButton iconOnly aria-label={name} icon={<Bell />} />}
      >
        <div className="echo-notifications__panel">
          <div className="echo-notifications__head">
            <span className="echo-notifications__count">{unread ? `${unread} unread` : "All read"}</span>
            {unread && onReadAll ? (
              <HardwareButton size="sm" variant="ghost" onClick={onReadAll}>
                Mark all read
              </HardwareButton>
            ) : null}
          </div>
          {notifications.length ? (
            <ul className="echo-notifications__list">
              {notifications.map((n) => (
                <Item
                  key={n.id}
                  as="li"
                  size="sm"
                  media={<span className="echo-notifications__led" data-unread={n.read ? undefined : ""} aria-hidden="true" />}
                  title={
                    <>
                      {n.title}
                      {n.read ? null : <span className="echo-notifications__sr"> (unread)</span>}
                    </>
                  }
                  description={n.body}
                  trailing={n.time}
                  {...(n.href ? { href: n.href } : {})}
                  onClick={() => onOpen?.(n.id)}
                />
              ))}
            </ul>
          ) : (
            <p className="echo-notifications__empty">{emptyText}</p>
          )}
        </div>
      </Popover>
      {unread ? (
        <span className="echo-notifications__badge" aria-hidden="true">
          <CountBadge count={unread} label="unread" />
        </span>
      ) : null}
    </span>
  );
}
