"use client";

import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { ProtectedChat } from "@/components/auth/protected-chat";
import { motion } from "framer-motion";
import { Download, Terminal, CheckCircle2, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function SetupPage() {
  const [platform, setPlatform] = useState<'win32' | 'linux' | 'darwin'>('linux');
  const [credentials, setCredentials] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const generateInstaller = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/agent/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate installer');
      }

      const data = await response.json();
      setCredentials(data.credentials);
      setStep(2);
      toast.success('Credentials generated!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate installer');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const configJson = credentials ? JSON.stringify({
    userId: credentials.userId,
    sharedSecret: credentials.sharedSecret,
    serverUrl: credentials.serverUrl,
    version: "1.0.0",
    autoStart: true,
    permissions: {
      mode: "balanced",
      allowedDirectories: [process.platform === 'win32' ? 'C:\\Users' : '/home']
    },
    telemetry: {
      enabled: true,
      anonymize: false
    }
  }, null, 2) : '';

  return (
    <AppLayout>
      <ProtectedChat>
        <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-12">
          {/* Header */}
          <div className="mb-12 text-center">
            <h1 className="text-4xl font-bold mb-4">
              Install Local Agent
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 text-lg">
              Connect your local environment to OperaStudio
            </p>
          </div>

          {/* Step Indicator */}
          <div className="mb-12 flex items-center justify-center gap-4">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-blue-600' : 'text-neutral-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-neutral-200 dark:bg-neutral-700'}`}>
                {step > 1 ? <CheckCircle2 className="w-5 h-5" /> : '1'}
              </div>
              <span className="font-medium">Choose Platform</span>
            </div>
            <div className="w-12 h-0.5 bg-neutral-300 dark:bg-neutral-600" />
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-blue-600' : 'text-neutral-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-neutral-200 dark:bg-neutral-700'}`}>
                {step > 2 ? <CheckCircle2 className="w-5 h-5" /> : '2'}
              </div>
              <span className="font-medium">Install & Configure</span>
            </div>
            <div className="w-12 h-0.5 bg-neutral-300 dark:bg-neutral-600" />
            <div className={`flex items-center gap-2 ${step >= 3 ? 'text-blue-600' : 'text-neutral-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-neutral-200 dark:bg-neutral-700'}`}>
                {step > 3 ? <CheckCircle2 className="w-5 h-5" /> : '3'}
              </div>
              <span className="font-medium">Start Agent</span>
            </div>
          </div>

          {/* Step 1: Platform Selection */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => setPlatform('linux')}
                  className={`p-6 rounded-lg border-2 transition-all ${
                    platform === 'linux'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/30'
                      : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
                  }`}
                >
                  <Terminal className="w-12 h-12 mx-auto mb-3" />
                  <div className="font-semibold">Linux</div>
                  <div className="text-sm text-neutral-600 dark:text-neutral-400">Ubuntu, Debian, etc.</div>
                </button>

                <button
                  onClick={() => setPlatform('win32')}
                  className={`p-6 rounded-lg border-2 transition-all ${
                    platform === 'win32'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/30'
                      : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
                  }`}
                >
                  <Terminal className="w-12 h-12 mx-auto mb-3" />
                  <div className="font-semibold">Windows</div>
                  <div className="text-sm text-neutral-600 dark:text-neutral-400">Windows 10/11</div>
                </button>

                <button
                  onClick={() => setPlatform('darwin')}
                  className={`p-6 rounded-lg border-2 transition-all ${
                    platform === 'darwin'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/30'
                      : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
                  }`}
                >
                  <Terminal className="w-12 h-12 mx-auto mb-3" />
                  <div className="font-semibold">macOS</div>
                  <div className="text-sm text-neutral-600 dark:text-neutral-400">macOS 11+</div>
                </button>
              </div>

              <button
                onClick={generateInstaller}
                disabled={loading}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Generating...' : 'Generate Credentials →'}
              </button>
            </motion.div>
          )}

          {/* Step 2: Installation Instructions */}
          {step === 2 && credentials && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Download Agent (Placeholder for now) */}
              <div className="p-6 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Download className="w-6 h-6 text-blue-600" />
                    <div>
                      <div className="font-semibold">Download Agent Binary</div>
                      <div className="text-sm text-neutral-600 dark:text-neutral-400">
                        Standalone executable for {platform}
                      </div>
                    </div>
                  </div>
                  <a
                    href={`/api/agent/download?platform=${platform}`}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </a>
                </div>
                <div className="text-sm text-neutral-600 dark:text-neutral-400">
                  Or build from source:
                  <a href="https://github.com/operastudio/local-agent" className="ml-2 text-blue-600 hover:underline inline-flex items-center gap-1">
                    GitHub <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Configuration */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">Configuration File</h3>
                  <button
                    onClick={() => copyToClipboard(configJson, 'Configuration')}
                    className="px-3 py-1.5 text-sm bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 rounded flex items-center gap-2 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </button>
                </div>

                <div className="relative">
                  <pre className="p-4 rounded-lg bg-neutral-900 text-neutral-100 overflow-x-auto text-sm">
                    <code>{configJson}</code>
                  </pre>
                </div>

                <div className="text-sm text-neutral-600 dark:text-neutral-400">
                  Save this as <code className="px-2 py-0.5 bg-neutral-200 dark:bg-neutral-700 rounded">~/.operastudio/config.json</code>
                </div>
              </div>

              {/* Installation Commands */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Installation Steps</h3>

                {platform === 'linux' && (
                  <div className="space-y-3">
                    <div className="p-4 rounded-lg bg-neutral-900 text-neutral-100">
                      <code className="text-sm">
                        mkdir -p ~/.operastudio<br/>
                        # Save config.json to ~/.operastudio/config.json<br/>
                        chmod +x operastudio-agent<br/>
                        ./operastudio-agent
                      </code>
                    </div>
                  </div>
                )}

                {platform === 'win32' && (
                  <div className="space-y-3">
                    <div className="p-4 rounded-lg bg-neutral-900 text-neutral-100">
                      <code className="text-sm">
                        mkdir %USERPROFILE%\.operastudio<br/>
                        # Save config.json to %USERPROFILE%\.operastudio\config.json<br/>
                        operastudio-agent.exe
                      </code>
                    </div>
                  </div>
                )}

                {platform === 'darwin' && (
                  <div className="space-y-3">
                    <div className="p-4 rounded-lg bg-neutral-900 text-neutral-100">
                      <code className="text-sm">
                        mkdir -p ~/.operastudio<br/>
                        # Save config.json to ~/.operastudio/config.json<br/>
                        chmod +x operastudio-agent<br/>
                        ./operastudio-agent
                      </code>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => window.location.href = '/'}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
              >
                Return to Chat →
              </button>
            </motion.div>
          )}
        </div>
      </div>
      </ProtectedChat>
    </AppLayout>
  );
}
