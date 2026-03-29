/**
 * DetectionTable — Reusable table component for detection results.
 * Shows class, confidence, and status with color-coded indicators.
 */

export default function DetectionTable({ detections = [], compact = false }) {
  if (detections.length === 0) {
    return (
      <div className="sg-card text-center py-8">
        <p className="font-mono text-sg-muted text-sm">
          [ NO DETECTIONS LOGGED ]
        </p>
      </div>
    );
  }

  return (
    <div className="sg-card overflow-x-auto p-0">
      <table className="sg-table">
        <thead>
          <tr>
            <th>#</th>
            <th>CLASS</th>
            <th>CONFIDENCE</th>
            <th>STATUS</th>
            {!compact && <th>SOURCE</th>}
          </tr>
        </thead>
        <tbody>
          {detections.map((det, i) => (
            <tr key={i}>
              <td className="text-sg-muted">{String(i + 1).padStart(3, "0")}</td>
              <td className="uppercase">{det.object_class}</td>
              <td>{(det.confidence * 100).toFixed(1)}%</td>
              <td>
                <span
                  className={
                    det.status === "INTRUSION"
                      ? "status-intrusion"
                      : det.status === "AUTHORIZED"
                      ? "status-authorized"
                      : "status-unknown"
                  }
                >
                  ■ {det.status}
                </span>
              </td>
              {!compact && <td className="text-sg-muted">{det.source || "—"}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
