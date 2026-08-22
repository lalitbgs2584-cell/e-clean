"use client";

import { Landmark, ShieldCheck } from "lucide-react";
import { useAuthoritySession, useAuthoritiesQuery } from "./hooks";
import { formatCompactDate } from "./shared";

export function AuthoritiesTable() {
  const { token } = useAuthoritySession();
  const authoritiesQuery = useAuthoritiesQuery(token);
  const rawData = authoritiesQuery.data;
  const authorities = Array.isArray(rawData) ? rawData : (rawData?.data ?? []);

  return (
    <article className="card table-card">
      <div className="card-title">
        <div>
          <h2>Authority officers</h2>
          <p>
            Every municipal authority account currently stored in the database.
          </p>
        </div>
        <span className="pill mint">{authorities.length} total</span>
      </div>
      {authoritiesQuery.isPending ? (
        <div className="empty-hint">
          <span>Loading authority officers…</span>
        </div>
      ) : authorities.length === 0 ? (
        <div className="empty-hint">
          <span>No authority accounts found.</span>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Officer</th>
                <th>Ward / zone</th>
                <th>Status</th>
                <th>Created</th>
                <th>Last updated</th>
              </tr>
            </thead>
            <tbody>
              {authorities.map((authority) => (
                <tr key={authority.id}>
                  <td>
                    <b>{authority.name}</b>
                    <small className="cell-sub">{authority.email}</small>
                  </td>
                  <td>{authority.zone ?? "City-wide"}</td>
                  <td>
                    <span
                      className={`pill ${authority.isActive ? "mint" : "red"}`}
                    >
                      {authority.isActive ? (
                        <ShieldCheck size={13} />
                      ) : (
                        <Landmark size={13} />
                      )}
                      {authority.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <small>{formatCompactDate(authority.createdAt)}</small>
                  </td>
                  <td>
                    <small>{formatCompactDate(authority.updatedAt)}</small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}
