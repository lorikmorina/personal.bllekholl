import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import axios from 'axios';
import * as tls from 'tls';
import * as net from 'net';
import { promises as dns } from 'dns';

// Extended subdomain list including security, audit, and business-focused terms
const COMMON_SUBDOMAINS = [
  'www', 'mail', 'ftp', 'localhost', 'webmail', 'smtp', 'pop', 'ns1', 'webdisk', 'ns2',
  'cpanel', 'whm', 'autodiscover', 'autoconfig', 'm', 'imap', 'test', 'ns', 'blog',
  'pop3', 'dev', 'www2', 'admin', 'forum', 'news', 'vpn', 'ns3', 'mail2', 'new',
  'mysql', 'old', 'lists', 'support', 'mobile', 'mx', 'static', 'docs', 'beta',
  'shop', 'sql', 'secure', 'demo', 'cp', 'calendar', 'wiki', 'web', 'media',
  'email', 'images', 'img', 'www1', 'intranet', 'portal', 'video', 'sip',
  'dns2', 'api', 'cdn', 'stats', 'dns1', 'ns4', 'www3', 'dns', 'search',
  'staging', 'server', 'mx1', 'chat', 'wap', 'my', 'svn', 'mail1', 'sites',
  'proxy', 'ads', 'host', 'crm', 'cms', 'backup', 'mx2', 'lyncdiscover',
  'info', 'apps', 'download', 'remote', 'db', 'forums', 'store', 'relay',
  'files', 'newsletter', 'app', 'live', 'owa', 'en', 'start', 'sms', 'office',
  'exchange', 'ipv4', 'mail3', 'help', 'blogs', 'helpdesk', 'web1', 'home',
  'library', 'ftp2', 'ntp', 'monitor', 'login', 'service', 'correo', 'www4',
  'moodle', 'mailgate', 'video2', 'game', 'ns0', 'testing', 'sandbox', 'job',
  'events', 'dialin', 'ml', 'fb', 'videos', 'music', 'a', 'partners',
  'mailhost', 'policy', 'diskstation', 'emailing', 'lib', 'chatserver',
  'catalog', 'pp', 'preview', 'fr', 'wiki2', 'archive', 'mm', 'timeline',
  'ftp1', 'ssl', 'web2', 'testing2', 'redmine', 'checkout', 'de',
  // Security and audit focused subdomains
  'audit', 'security', 'sec', 'compliance', 'risk', 'governance', 'grc',
  'pentest', 'vulnerability', 'vuln', 'scan', 'scanner', 'assessment',
  'forensics', 'incident', 'response', 'soc', 'operations', 'monitoring',
  'log', 'siem', 'splunk', 'elastic', 'kibana', 'grafana', 'prometheus',
  'alert', 'alerting', 'notification', 'report', 'reporting', 'dashboard',
  'metrics', 'analytics', 'business', 'bi', 'intelligence', 'data',
  'warehouse', 'etl', 'pipeline', 'stream', 'kafka', 'rabbit', 'queue'
];

// Optimized subdomain list - focused on most common findings
const ESSENTIAL_SUBDOMAINS = [
  // Core infrastructure
  'www', 'mail', 'api', 'admin', 'app', 'portal', 'dashboard', 'cdn', 'static',
  // Security & compliance
  'audit', 'security', 'sec', 'compliance', 'monitor', 'log', 'siem',
  // Development
  'dev', 'test', 'staging', 'beta', 'demo', 'sandbox',
  // Services
  'support', 'help', 'docs', 'blog', 'news', 'forum', 'chat',
  // Technical
  'ftp', 'smtp', 'pop', 'imap', 'vpn', 'proxy', 'gateway',
  // Business
  'shop', 'store', 'pay', 'billing', 'crm', 'erp'
];

// Extended patterns for security-focused discovery
const SECURITY_PATTERNS = [
  'audit', 'security', 'compliance', 'admin', 'management', 'control',
  'dashboard', 'portal', 'console', 'monitor', 'soc', 'siem'
];

// Function to query Certificate Transparency logs
const queryCtLogs = async (domain: string): Promise<string[]> => {
  const discoveredSubdomains = new Set<string>();
  
  try {
    // Query crt.sh (Certificate Transparency database)
    console.log(`Querying Certificate Transparency logs for: ${domain}`);
    
    const response = await axios.get(`https://crt.sh/`, {
      params: {
        q: `%.${domain}`,
        output: 'json'
      },
      timeout: 10000
    });

    if (response.data && Array.isArray(response.data)) {
      response.data.forEach((cert: any) => {
        if (cert.name_value) {
          // Parse Subject Alternative Names and Common Names
          const names = cert.name_value.split('\n');
          names.forEach((name: string) => {
            const cleanName = name.trim().toLowerCase();
            
            // Only include subdomains of our target domain
            if (cleanName.endsWith(`.${domain}`) && cleanName !== domain) {
              // Remove wildcards and clean up
              const subdomain = cleanName.replace(/^\*\./, '');
              if (subdomain.includes(domain) && !subdomain.includes(' ')) {
                discoveredSubdomains.add(subdomain);
              }
            }
          });
        }
      });
    }
  } catch (error) {
    console.error('Error querying CT logs:', error);
  }

  // Also try alternative CT log APIs as backup
  try {
    const certspotterResponse = await axios.get(`https://api.certspotter.com/v1/issuances`, {
      params: {
        domain: domain,
        include_subdomains: true,
        expand: 'dns_names'
      },
      timeout: 8000
    });

    if (certspotterResponse.data && Array.isArray(certspotterResponse.data)) {
      certspotterResponse.data.forEach((cert: any) => {
        if (cert.dns_names) {
          cert.dns_names.forEach((name: string) => {
            const cleanName = name.trim().toLowerCase();
            if (cleanName.endsWith(`.${domain}`) && cleanName !== domain) {
              const subdomain = cleanName.replace(/^\*\./, '');
              if (subdomain.includes(domain) && !subdomain.includes(' ')) {
                discoveredSubdomains.add(subdomain);
              }
            }
          });
        }
      });
    }
  } catch (error) {
    console.log('Certspotter API unavailable, continuing with crt.sh results');
  }

  const results = Array.from(discoveredSubdomains);
  console.log(`Found ${results.length} subdomains from Certificate Transparency logs`);
  return results;
};

// Function to extract subdomains from SSL certificate SAN
const extractSanSubdomains = async (hostname: string): Promise<string[]> => {
  return new Promise((resolve) => {
    const discoveredSubdomains = new Set<string>();
    
    const socket = tls.connect(443, hostname, {
      servername: hostname,
      rejectUnauthorized: false
    }, () => {
      const cert = socket.getPeerCertificate(true);
      
      if (cert && cert.subjectaltname) {
        // Parse Subject Alternative Names
        const sanList = cert.subjectaltname.split(', ');
        sanList.forEach((san: string) => {
          if (san.startsWith('DNS:')) {
            const dnsName = san.substring(4).toLowerCase();
            // Remove wildcards and validate
            const cleanName = dnsName.replace(/^\*\./, '');
            if (cleanName.includes('.') && !cleanName.includes(' ')) {
              discoveredSubdomains.add(cleanName);
            }
          }
        });
      }
      
      socket.end();
      resolve(Array.from(discoveredSubdomains));
    });

    socket.on('error', () => {
      resolve([]);
    });

    socket.setTimeout(5000, () => {
      socket.destroy();
      resolve([]);
    });
  });
};

// Function to perform port scanning on common ports
const performPortScanning = async (domain: string): Promise<string[]> => {
  const discoveredHosts = new Set<string>();
  console.log(`Starting port scanning for potential subdomains of: ${domain}`);
  
  // Common ports to scan
  const commonPorts = [80, 443, 8080, 8443, 3000, 8000, 9000, 5000, 4000, 8888, 9999];
  
  // Get the main domain's IP to scan nearby ranges
  try {
    const mainIp = await dns.resolve4(domain);
    if (mainIp && mainIp.length > 0) {
      console.log(`Main domain ${domain} resolves to: ${mainIp[0]}`);
      
      // For each discovered subdomain candidate, try to connect to common ports
      const candidates = [
        ...COMMON_SUBDOMAINS.map(sub => `${sub}.${domain}`),
        // Try some variations
        `audit.${domain}`, `security.${domain}`, `sec.${domain}`, `compliance.${domain}`,
        `admin.${domain}`, `portal.${domain}`, `dashboard.${domain}`, `app.${domain}`,
        `api.${domain}`, `services.${domain}`, `gateway.${domain}`, `edge.${domain}`
      ];
      
      // Try to resolve each candidate and test connectivity
      const portScanPromises = candidates.slice(0, 100).map(async (hostname) => {
        try {
          // First try DNS resolution
          const ips = await dns.resolve4(hostname);
          if (ips && ips.length > 0) {
            // If DNS resolves, try to connect to common ports
            const portTests = commonPorts.slice(0, 3).map(port => testPortConnection(hostname, port));
            const results = await Promise.allSettled(portTests);
            
            // If any port is open, consider this a valid subdomain
            const hasOpenPort = results.some(result => 
              result.status === 'fulfilled' && result.value === true
            );
            
            if (hasOpenPort) {
              console.log(`Port scan discovered: ${hostname}`);
              return hostname;
            }
          }
        } catch (error) {
          // DNS resolution failed, subdomain doesn't exist
        }
        return null;
      });
      
      const portScanResults = await Promise.allSettled(portScanPromises);
      portScanResults.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          discoveredHosts.add(result.value);
        }
      });
    }
  } catch (error) {
    console.log('Could not resolve main domain for port scanning');
  }
  
  const results = Array.from(discoveredHosts);
  console.log(`Port scanning discovered ${results.length} live hosts`);
  return results;
};

// Function to test if a port is open on a host
const testPortConnection = (hostname: string, port: number): Promise<boolean> => {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    
    const timeout = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, 2000); // 2 second timeout
    
    socket.connect(port, hostname, () => {
      clearTimeout(timeout);
      socket.destroy();
      resolve(true);
    });
    
    socket.on('error', () => {
      clearTimeout(timeout);
      resolve(false);
    });
  });
};

// Enhanced DNS enumeration with more aggressive techniques
const performDnsEnumeration = async (domain: string): Promise<string[]> => {
  const discoveredSubdomains = new Set<string>();
  
  console.log(`Starting enhanced DNS enumeration for: ${domain}`);
  
  try {
    // 1. Get nameservers for the domain
    const nameservers = await dns.resolveNs(domain);
    console.log(`Found ${nameservers.length} nameservers for ${domain}`);
    
    // 2. Try to get MX records (mail servers often reveal subdomains)
    try {
      const mxRecords = await dns.resolveMx(domain);
      mxRecords.forEach(mx => {
        if (mx.exchange.endsWith(`.${domain}`)) {
          discoveredSubdomains.add(mx.exchange);
        }
      });
      console.log(`Found ${mxRecords.length} MX records`);
    } catch (error) {
      console.log('No MX records found');
    }
    
    // 3. Enhanced TXT record analysis
    try {
      const txtRecords = await dns.resolveTxt(domain);
      txtRecords.forEach(txtArray => {
        txtArray.forEach(txt => {
          // Look for subdomain references in TXT records (broader pattern)
          const subdomainMatches = txt.match(new RegExp(`([a-zA-Z0-9][a-zA-Z0-9\\-]*[a-zA-Z0-9]*\\.${domain.replace('.', '\\.')})`, 'g'));
          if (subdomainMatches) {
            subdomainMatches.forEach(match => discoveredSubdomains.add(match));
          }
          
          // Look for specific service mentions that might indicate subdomains
          const serviceKeywords = ['audit', 'security', 'admin', 'api', 'portal', 'dashboard', 'app'];
          serviceKeywords.forEach(keyword => {
            if (txt.toLowerCase().includes(keyword)) {
              discoveredSubdomains.add(`${keyword}.${domain}`);
            }
          });
        });
      });
      console.log(`Checked TXT records for subdomain references`);
    } catch (error) {
      console.log('No TXT records found');
    }
    
    // 4. Enhanced CNAME and DNS record discovery
    console.log('Performing comprehensive DNS record analysis...');
    const extendedSubdomainList = [
      ...COMMON_SUBDOMAINS,
      // Business and security focused
      'audit', 'security', 'compliance', 'admin', 'dashboard', 'portal',
      'app', 'application', 'service', 'services', 'gateway', 'api',
      'management', 'mgmt', 'control', 'panel', 'console', 'interface',
      // Technical variations
      'www-audit', 'audit-www', 'sec-audit', 'compliance-portal',
      'admin-portal', 'user-portal', 'client-portal', 'partner-portal'
    ];
    
    const dnsPromises = extendedSubdomainList.map(async (subdomain) => {
      const fullSubdomain = `${subdomain}.${domain}`;
      const results = [];
      
      try {
        // Try multiple DNS record types
        await dns.resolve4(fullSubdomain);
        results.push(fullSubdomain);
      } catch (error) {
        try {
          await dns.resolve6(fullSubdomain);
          results.push(fullSubdomain);
        } catch (error2) {
          try {
            await dns.resolveCname(fullSubdomain);
            results.push(fullSubdomain);
          } catch (error3) {
            // Try with 'www' prefix variations
            try {
              await dns.resolve4(`www-${subdomain}.${domain}`);
              results.push(`www-${subdomain}.${domain}`);
            } catch (error4) {
              // Subdomain doesn't exist
            }
          }
        }
      }
      
      return results;
    });
    
    const dnsResults = await Promise.allSettled(dnsPromises);
    dnsResults.forEach(result => {
      if (result.status === 'fulfilled') {
        result.value.forEach(subdomain => discoveredSubdomains.add(subdomain));
      }
    });
    
    // 5. Reverse DNS lookups on discovered IPs
    console.log('Performing reverse DNS lookups...');
    const discoveredIps = new Set<string>();
    
    for (const subdomain of Array.from(discoveredSubdomains)) {
      try {
        const ips = await dns.resolve4(subdomain);
        ips.forEach(ip => discoveredIps.add(ip));
      } catch (error) {
        // IP resolution failed
      }
    }
    
    // Try reverse DNS on discovered IPs to find more subdomains
    const reverseDnsPromises = Array.from(discoveredIps).slice(0, 20).map(async (ip) => {
      try {
        const hostnames = await dns.reverse(ip);
        return hostnames.filter(hostname => hostname.endsWith(`.${domain}`));
      } catch (error) {
        return [];
      }
    });
    
    const reverseDnsResults = await Promise.allSettled(reverseDnsPromises);
    reverseDnsResults.forEach(result => {
      if (result.status === 'fulfilled') {
        result.value.forEach(hostname => discoveredSubdomains.add(hostname));
      }
    });
    
    // 6. Try specific patterns that security tools often use
    const securityPatterns = [
      'audit', 'security', 'sec', 'compliance', 'pentest', 'scan', 'scanner',
      'vulnerability', 'vuln', 'assessment', 'monitor', 'monitoring', 'log',
      'logs', 'siem', 'soc', 'incident', 'forensics', 'threat', 'intel',
      'dashboard', 'portal', 'console', 'admin', 'management', 'control'
    ];
    
    console.log('Testing security-focused subdomain patterns...');
    const securityPromises = securityPatterns.map(async (pattern) => {
      const testDomains = [
        `${pattern}.${domain}`,
        `${pattern}-portal.${domain}`,
        `${pattern}-app.${domain}`,
        `${pattern}-api.${domain}`,
        `app-${pattern}.${domain}`,
        `portal-${pattern}.${domain}`
      ];
      
      const results = [];
      for (const testDomain of testDomains) {
        try {
          await dns.resolve4(testDomain);
          results.push(testDomain);
        } catch (error) {
          try {
            await dns.resolve6(testDomain);
            results.push(testDomain);
          } catch (error2) {
            // Doesn't exist
          }
        }
      }
      return results;
    });
    
    const securityResults = await Promise.allSettled(securityPromises);
    securityResults.forEach(result => {
      if (result.status === 'fulfilled') {
        result.value.forEach(subdomain => discoveredSubdomains.add(subdomain));
      }
    });
    
  } catch (error) {
    console.error('Enhanced DNS enumeration error:', error);
  }
  
  const results = Array.from(discoveredSubdomains);
  console.log(`Enhanced DNS enumeration found ${results.length} potential subdomains`);
  return results;
};

// Function to check if a subdomain exists
const checkSubdomain = async (subdomain: string): Promise<{
  subdomain: string;
  exists: boolean;
  ip?: string;
  error?: string;
  method?: 'wordlist' | 'certificate_transparency' | 'san_analysis' | 'dns_enumeration' | 'port_scanning';
  ssl?: {
    valid: boolean;
    issuer?: string;
    validFrom?: string;
    validTo?: string;
    daysUntilExpiry?: number;
    error?: string;
  };
}> => {
  try {
    // Quick check with short timeout
    const response = await axios.head(`https://${subdomain}`, {
      timeout: 2000,
      maxRedirects: 2,
      validateStatus: () => true
    });

    return {
      subdomain,
      exists: true,
      ip: response.request?.socket?.remoteAddress
    };
  } catch (error: any) {
    if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
      return {
        subdomain,
        exists: false,
        error: 'DNS resolution failed'
      };
    }

    // Try HTTP as fallback
    try {
      await axios.head(`http://${subdomain}`, {
        timeout: 2000,
        maxRedirects: 2,
        validateStatus: () => true
      });

      return {
        subdomain,
        exists: true,
        error: 'HTTPS not available, HTTP works'
      };
    } catch (httpError) {
      return {
        subdomain,
        exists: false,
        error: error.message
      };
    }
  }
};

// Function to check SSL certificate details (simplified for speed)
const checkSSLCertificate = async (hostname: string): Promise<{
  valid: boolean;
  issuer?: string;
  validFrom?: string;
  validTo?: string;
  daysUntilExpiry?: number;
  error?: string;
}> => {
  return new Promise((resolve) => {
    const socket = tls.connect(443, hostname, {
      servername: hostname,
      rejectUnauthorized: false
    }, () => {
      const cert = socket.getPeerCertificate();
      
      if (cert && Object.keys(cert).length > 0) {
        const validTo = new Date(cert.valid_to);
        const now = new Date();
        const daysUntilExpiry = Math.ceil((validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        resolve({
          valid: socket.authorized,
          issuer: cert.issuer?.CN || cert.issuer?.O || 'Unknown',
          validFrom: cert.valid_from,
          validTo: cert.valid_to,
          daysUntilExpiry
        });
      } else {
        resolve({
          valid: false,
          error: 'No certificate found'
        });
      }
      
      socket.end();
    });

    socket.on('error', (error) => {
      resolve({
        valid: false,
        error: error.message
      });
    });

    socket.setTimeout(2000, () => {
      socket.destroy();
      resolve({
        valid: false,
        error: 'Connection timeout'
      });
    });
  });
};

// Function to extract domain from URL
const extractDomain = (url: string): string => {
  try {
    // Remove protocol if present
    let domain = url.replace(/^https?:\/\//i, '');
    // Remove www if present
    domain = domain.replace(/^www\./i, '');
    // Remove path and query parameters
    domain = domain.split('/')[0].split('?')[0];
    return domain;
  } catch (error) {
    return url;
  }
};

// Function to perform quick port scanning (optimized for speed)
const performQuickPortScan = async (domain: string): Promise<string[]> => {
  const discoveredHosts = new Set<string>();
  console.log(`Quick port scan for: ${domain}`);
  
  // Only scan the most common ports to save time
  const quickPorts = [80, 443, 8080, 8443];
  
  try {
    // Test only high-priority subdomain candidates
    const priorityCandidates = [
      ...ESSENTIAL_SUBDOMAINS.slice(0, 20).map(sub => `${sub}.${domain}`),
      ...SECURITY_PATTERNS.map(pattern => `${pattern}.${domain}`)
    ];
    
    // Process in smaller batches with timeout
    const batchSize = 8;
    const maxBatches = 5; // Limit to prevent timeout
    
    for (let i = 0; i < Math.min(priorityCandidates.length, batchSize * maxBatches); i += batchSize) {
      const batch = priorityCandidates.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (hostname) => {
        try {
          // Quick DNS check first
          const ips = await Promise.race([
            dns.resolve4(hostname),
            new Promise((_, reject) => setTimeout(() => reject(new Error('DNS timeout')), 1000))
          ]) as string[];
          
          if (ips && ips.length > 0) {
            // Quick port test on just HTTP/HTTPS
            const portTest = await Promise.race([
              testQuickConnection(hostname, 443),
              testQuickConnection(hostname, 80),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Port timeout')), 1500))
            ]);
            
            if (portTest) {
              return hostname;
            }
          }
        } catch (error) {
          // Skip failed candidates
        }
        return null;
      });
      
      const results = await Promise.allSettled(batchPromises);
      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          discoveredHosts.add(result.value);
        }
      });
      
      // Micro delay
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  } catch (error) {
    console.log('Quick port scan completed with some errors');
  }
  
  const results = Array.from(discoveredHosts);
  console.log(`Quick port scan found ${results.length} live hosts`);
  return results;
};

// Optimized port connection test
const testQuickConnection = (hostname: string, port: number): Promise<boolean> => {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    
    const timeout = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, 800); // Reduced timeout
    
    socket.connect(port, hostname, () => {
      clearTimeout(timeout);
      socket.destroy();
      resolve(true);
    });
    
    socket.on('error', () => {
      clearTimeout(timeout);
      resolve(false);
    });
  });
};

// Optimized DNS enumeration
const performOptimizedDnsEnumeration = async (domain: string): Promise<string[]> => {
  const discoveredSubdomains = new Set<string>();
  console.log(`Optimized DNS enumeration for: ${domain}`);
  
  try {
    // Quick MX record check
    try {
      const mxRecords = await Promise.race([
        dns.resolveMx(domain),
        new Promise((_, reject) => setTimeout(() => reject(new Error('MX timeout')), 2000))
      ]) as any[];
      
      mxRecords.forEach(mx => {
        if (mx.exchange.endsWith(`.${domain}`)) {
          discoveredSubdomains.add(mx.exchange);
        }
      });
    } catch (error) {
      // Skip MX if slow
    }
    
    // Priority DNS brute force with timeout
    const prioritySubdomains = [
      ...ESSENTIAL_SUBDOMAINS,
      ...SECURITY_PATTERNS.map(pattern => `${pattern}.${domain}`),
      ...SECURITY_PATTERNS.map(pattern => `${pattern}-portal.${domain}`),
      ...SECURITY_PATTERNS.map(pattern => `app-${pattern}.${domain}`)
    ];
    
    // Process in time-limited batches
    const batchSize = 15;
    const maxTime = 4000; // 4 seconds max for DNS
    const startTime = Date.now();
    
    for (let i = 0; i < prioritySubdomains.length && (Date.now() - startTime) < maxTime; i += batchSize) {
      const batch = prioritySubdomains.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (subdomain) => {
        try {
          await Promise.race([
            dns.resolve4(subdomain),
            new Promise((_, reject) => setTimeout(() => reject(new Error('DNS timeout')), 800))
          ]);
          return subdomain;
        } catch (error) {
          try {
            await Promise.race([
              dns.resolve6(subdomain),
              new Promise((_, reject) => setTimeout(() => reject(new Error('DNS timeout')), 800))
            ]);
            return subdomain;
          } catch (error2) {
            return null;
          }
        }
      });
      
      const results = await Promise.allSettled(batchPromises);
      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          discoveredSubdomains.add(result.value);
        }
      });
      
      // Check time limit
      if ((Date.now() - startTime) > maxTime) {
        console.log('DNS enumeration time limit reached');
        break;
      }
    }
    
  } catch (error) {
    console.error('Optimized DNS enumeration error:', error);
  }
  
  const results = Array.from(discoveredSubdomains);
  console.log(`Optimized DNS enumeration found ${results.length} subdomains`);
  return results;
};

// Quick CT logs query with timeout
const queryCtLogsQuick = async (domain: string): Promise<string[]> => {
  const discoveredSubdomains = new Set<string>();
  
  try {
    console.log(`Quick CT logs query for: ${domain}`);
    
    const response = await Promise.race([
      axios.get(`https://crt.sh/`, {
        params: { q: `%.${domain}`, output: 'json' },
        timeout: 3000
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('CT timeout')), 3000))
    ]) as any;

    if (response.data && Array.isArray(response.data)) {
      // Process only first 100 entries to save time
      const entries = response.data.slice(0, 100);
      
      entries.forEach((cert: any) => {
        if (cert.name_value) {
          const names = cert.name_value.split('\n');
          names.forEach((name: string) => {
            const cleanName = name.trim().toLowerCase();
            if (cleanName.endsWith(`.${domain}`) && cleanName !== domain) {
              const subdomain = cleanName.replace(/^\*\./, '');
              if (subdomain.includes(domain) && !subdomain.includes(' ')) {
                discoveredSubdomains.add(subdomain);
              }
            }
          });
        }
      });
    }
  } catch (error) {
    console.log('CT logs query timed out or failed, continuing...');
  }

  const results = Array.from(discoveredSubdomains);
  console.log(`Quick CT logs found ${results.length} subdomains`);
  return results;
};

// Quick SSL SAN extraction with timeout
const extractSanSubdomainsQuick = async (hostname: string): Promise<string[]> => {
  return new Promise((resolve) => {
    const discoveredSubdomains = new Set<string>();
    
    const timeout = setTimeout(() => {
      resolve([]);
    }, 2000); // 2 second timeout
    
    const socket = tls.connect(443, hostname, {
      servername: hostname,
      rejectUnauthorized: false
    }, () => {
      clearTimeout(timeout);
      
      const cert = socket.getPeerCertificate(true);
      
      if (cert && cert.subjectaltname) {
        const sanList = cert.subjectaltname.split(', ');
        sanList.forEach((san: string) => {
          if (san.startsWith('DNS:')) {
            const dnsName = san.substring(4).toLowerCase();
            const cleanName = dnsName.replace(/^\*\./, '');
            if (cleanName.includes('.') && !cleanName.includes(' ')) {
              discoveredSubdomains.add(cleanName);
            }
          }
        });
      }
      
      socket.end();
      resolve(Array.from(discoveredSubdomains));
    });

    socket.on('error', () => {
      clearTimeout(timeout);
      resolve([]);
    });
  });
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { domain, mode = 'optimized', deepScanRequest = false } = body; // Add deepScanRequest parameter

    if (!domain) {
      return NextResponse.json({ error: "Domain is required" }, { status: 400 });
    }

    // Authentication checks - bypass for deep scan requests
    if (!deepScanRequest) {
      const cookieStore = cookies();
      const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        return NextResponse.json({
          error: "unauthorized",
          message: "Authentication required to use subdomain finder",
          redirectTo: "/signup"
        }, { status: 401 });
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('subscription_plan')
        .eq('id', session.user.id)
        .single();

      if (profileError) {
        return NextResponse.json({
          error: "profile_error",
          message: "Error checking subscription status",
        }, { status: 500 });
      }

      if (!profile || profile.subscription_plan === 'free') {
        return NextResponse.json({
          error: "subscription_required",
          message: "A paid subscription is required to use the subdomain finder",
          redirectTo: "/pricing"
        }, { status: 403 });
      }
    }

    const cleanDomain = extractDomain(domain);
    
    if (!cleanDomain.includes('.')) {
      return NextResponse.json({
        error: "invalid_domain",
        message: "Please provide a valid domain name"
      }, { status: 400 });
    }

    console.log(`Starting time-optimized subdomain discovery for: ${cleanDomain}`);
    const startTime = Date.now();

    const allSubdomains = new Set<string>();
    const foundSubdomains = [];
    const errors = [];

    // Step 1: Quick Port Scanning (2-3 seconds max)
    console.log('Step 1: Quick port scanning...');
    const portScanSubdomains = await performQuickPortScan(cleanDomain);
    portScanSubdomains.forEach(sub => allSubdomains.add(sub));

    // Step 2: Optimized DNS Enumeration (3-4 seconds max)
    console.log('Step 2: Optimized DNS enumeration...');
    const dnsSubdomains = await performOptimizedDnsEnumeration(cleanDomain);
    dnsSubdomains.forEach(sub => allSubdomains.add(sub));

    // Step 3: Quick CT logs (3 seconds max)
    console.log('Step 3: Quick CT logs query...');
    const ctSubdomains = await queryCtLogsQuick(cleanDomain);
    ctSubdomains.forEach(sub => allSubdomains.add(sub));

    // Step 4: Quick SSL SAN (2 seconds max)
    console.log('Step 4: Quick SSL SAN analysis...');
    try {
      const sanSubdomains = await extractSanSubdomainsQuick(cleanDomain);
      sanSubdomains.forEach(sub => {
        if (sub.endsWith(`.${cleanDomain}`)) {
          allSubdomains.add(sub);
        }
      });
    } catch (error) {
      console.log('SSL SAN analysis skipped');
    }

    // Step 5: Add essential wordlist
    console.log('Step 5: Adding essential wordlist...');
    ESSENTIAL_SUBDOMAINS.forEach(sub => {
      allSubdomains.add(`${sub}.${cleanDomain}`);
    });

    const uniqueSubdomains = Array.from(allSubdomains);
    console.log(`Total unique subdomains to verify: ${uniqueSubdomains.length}`);

    // Step 6: Quick verification with time limit
    console.log('Step 6: Quick verification...');
    const verificationStartTime = Date.now();
    const maxVerificationTime = 3000; // 3 seconds max for verification
    const batchSize = 10;

    for (let i = 0; i < uniqueSubdomains.length; i += batchSize) {
      // Check if we're running out of time
      if ((Date.now() - verificationStartTime) > maxVerificationTime) {
        console.log('Verification time limit reached');
        break;
      }

      const batch = uniqueSubdomains.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (subdomain) => {
        try {
          // Quick existence check with short timeout
          const response = await Promise.race([
            axios.head(`https://${subdomain}`, {
              timeout: 1500,
              maxRedirects: 1,
              validateStatus: () => true
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500))
          ]) as any;

          const result = {
            subdomain,
            exists: true,
            ip: response.request?.socket?.remoteAddress,
            ssl: null // Skip SSL check for speed
          };

          // Add method information
          if (portScanSubdomains.includes(subdomain)) {
            result.method = 'port_scanning';
          } else if (dnsSubdomains.includes(subdomain)) {
            result.method = 'dns_enumeration';
          } else if (ctSubdomains.includes(subdomain)) {
            result.method = 'certificate_transparency';
          } else if (ESSENTIAL_SUBDOMAINS.some(common => subdomain === `${common}.${cleanDomain}`)) {
            result.method = 'wordlist';
          } else {
            result.method = 'san_analysis';
          }

          return result;
        } catch (error) {
          return null;
        }
      });

      const results = await Promise.allSettled(batchPromises);
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          foundSubdomains.push(result.value);
        }
      });

      // Micro delay
      await new Promise(resolve => setTimeout(resolve, 25));
    }

    const totalTime = Date.now() - startTime;
    console.log(`Optimized scan completed in ${totalTime}ms. Found ${foundSubdomains.length} subdomains.`);

    // Calculate summary
    const summary = {
      totalChecked: uniqueSubdomains.length,
      totalFound: foundSubdomains.length,
      withSSL: 0, // Not checked in optimized mode
      withoutSSL: 0,
      sslErrors: 0,
      scanTime: totalTime,
      methods: {
        port_scanning: foundSubdomains.filter(sub => sub.method === 'port_scanning').length,
        dns_enumeration: foundSubdomains.filter(sub => sub.method === 'dns_enumeration').length,
        certificate_transparency: foundSubdomains.filter(sub => sub.method === 'certificate_transparency').length,
        wordlist: foundSubdomains.filter(sub => sub.method === 'wordlist').length,
        san_analysis: foundSubdomains.filter(sub => sub.method === 'san_analysis').length
      }
    };

    return NextResponse.json({
      domain: cleanDomain,
      subdomains: foundSubdomains,
      summary,
      errors: [],
      scannedAt: new Date().toISOString(),
      mode: 'optimized',
      scanTimeMs: totalTime,
      discoveredFrom: {
        portScanning: portScanSubdomains.length,
        dnsEnumeration: dnsSubdomains.length,
        certificateTransparency: ctSubdomains.length,
        wordlist: ESSENTIAL_SUBDOMAINS.length,
        totalUnique: uniqueSubdomains.length
      }
    });

  } catch (error) {
    console.error('Error in optimized subdomain finder:', error);
    return NextResponse.json({
      error: "scan_failed",
      message: error instanceof Error ? error.message : "An unknown error occurred"
    }, { status: 500 });
  }
} 