'use client';

import { useState, useEffect } from 'react';
import styles from './diagnostic.module.css';

interface DiagnosticResult {
  namenode?: {
    ip: string;
    port: number;
    reachable: boolean;
    error?: string;
  };
  datanodes: Array<{
    name: string;
    ip: string;
    reachable: boolean;
    error?: string;
  }>;
  hdfsUrl?: string;
  mode?: string;
}

export default function HadoopDiagnostic() {
  const [diagnostic, setDiagnostic] = useState<DiagnosticResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runDiagnostic = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/diagnostic/hadoop-health');
      const data = await response.json();
      setDiagnostic(data);
    } catch (err) {
      setError(`Failed to run diagnostic: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runDiagnostic();
  }, []);

  const StatusIcon = ({ reachable }: { reachable: boolean }) => (
    <span className={reachable ? styles.statusOk : styles.statusError}>
      {reachable ? '✓ OK' : '✗ ERROR'}
    </span>
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>🔍 Hadoop Cluster Diagnostic</h1>
        <p>Test connectivity to your Hadoop cluster nodes</p>
      </div>

      <div className={styles.content}>
        {diagnostic && (
          <>
            <div className={styles.section}>
              <h2>Configuration</h2>
              <div className={styles.config}>
                <div className={styles.configItem}>
                  <span className={styles.label}>Mode:</span>
                  <span className={styles.value}>{diagnostic.mode || 'local'}</span>
                </div>
                {diagnostic.mode === 'webhdfs' && diagnostic.hdfsUrl && (
                  <div className={styles.configItem}>
                    <span className={styles.label}>WebHDFS URL:</span>
                    <span className={styles.value}>{diagnostic.hdfsUrl}</span>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.section}>
              <h2>🖥️ NameNode</h2>
              {diagnostic.namenode ? (
                <div className={styles.nodeCard}>
                  <div className={styles.nodeHeader}>
                    <span>
                      {diagnostic.namenode.ip}:{diagnostic.namenode.port}
                    </span>
                    <StatusIcon reachable={diagnostic.namenode.reachable} />
                  </div>
                  {diagnostic.namenode.error && (
                    <div className={styles.error}>{diagnostic.namenode.error}</div>
                  )}
                  {diagnostic.namenode.reachable && (
                    <div className={styles.success}>
                      ✓ Successfully connected to NameNode
                    </div>
                  )}
                </div>
              ) : (
                <div className={styles.warning}>
                  ⚠️ HADOOP_NAMENODE_IP not configured
                </div>
              )}
            </div>

            <div className={styles.section}>
              <h2>💾 DataNodes</h2>
              {diagnostic.datanodes.length > 0 ? (
                <div className={styles.nodeList}>
                  {diagnostic.datanodes.map((node, idx) => (
                    <div key={idx} className={styles.nodeCard}>
                      <div className={styles.nodeHeader}>
                        <span>
                          {node.name} - {node.ip}:{diagnostic.namenode?.port || 9870}
                        </span>
                        <StatusIcon reachable={node.reachable} />
                      </div>
                      {node.error && <div className={styles.error}>{node.error}</div>}
                      {node.reachable && (
                        <div className={styles.success}>✓ Connected</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.warning}>
                  ⚠️ No DataNodes configured
                </div>
              )}
            </div>

            <div className={styles.section}>
              <h2>📝 Recommendations</h2>
              <div className={styles.recommendations}>
                {diagnostic.namenode?.reachable ? (
                  <div className={styles.recommend}>
                    ✓ NameNode is reachable - WebHDFS connection should work
                  </div>
                ) : (
                  <div className={styles.recommend}>
                    ✗ NameNode is not reachable - Check:
                    <ul>
                      <li>HADOOP_NAMENODE_IP is correct in .env.local</li>
                      <li>Network connectivity to the NameNode</li>
                      <li>Firewall rules for port{' '}
                        {diagnostic.namenode?.port || 9870}</li>
                      <li>Hadoop NameNode service is running</li>
                    </ul>
                  </div>
                )}

                {diagnostic.datanodes.some((d) => !d.reachable) && (
                  <div className={styles.recommend}>
                    ✗ Some DataNodes are not reachable:
                    <ul>
                      <li>This may cause WebHDFS write operations to fail</li>
                      <li>Check DataNode IPs in .env.local</li>
                      <li>Verify DataNode services are running</li>
                      <li>Check firewall rules for DataNode ports</li>
                    </ul>
                  </div>
                )}

                {diagnostic.datanodes.every((d) => d.reachable) &&
                  diagnostic.namenode?.reachable && (
                    <div className={styles.recommend}>
                      ✓ All nodes are reachable. If you still see WebHDFS errors:
                      <ul>
                        <li>
                          It might be a redirect port issue (WebHDFS redirects to port
                          9864 for writes)
                        </li>
                        <li>Check the Hadoop logs on DataNodes</li>
                        <li>
                          See WEBHDFS_TROUBLESHOOTING.md for more details
                        </li>
                      </ul>
                    </div>
                  )}
              </div>
            </div>
          </>
        )}

        {error && <div className={styles.errorBox}>{error}</div>}

        <button
          onClick={runDiagnostic}
          disabled={loading}
          className={styles.button}
        >
          {loading ? '⏳ Running...' : '🔄 Re-run Diagnostic'}
        </button>
      </div>

      <div className={styles.footer}>
        <p>
          For detailed troubleshooting instructions, see{' '}
          <code>WEBHDFS_TROUBLESHOOTING.md</code>
        </p>
      </div>
    </div>
  );
}
