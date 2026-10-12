/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { MeetingConfig, AppView, ThemeType } from './types';
import { generateMeetingId, decodeMeetingConfig } from './utils/token';
import { MeetingSettings } from './components/MeetingSettings';
import { MeetingLobby } from './components/MeetingLobby';
import { ActiveMeeting } from './components/ActiveMeeting';

const DEFAULT_CONFIG: MeetingConfig = {
  title: 'Executive Strategic Review',
  date: new Date().toISOString().split('T')[0],
  time: '10:30 AM EST',
  duration: '45 mins',
  expectedParticipants: 4,
  meetingId: generateMeetingId(),
  platform: 'google_meet',
  theme: 'auto',
  layout: 'speaker',
  host: {
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    fullName: 'Dr. Nadia Hassan Mansouri',
    displayName: 'Dr. Nadia .M',
    email: 'dr.nadia.almansouri@enterprise.com',
    jobTitle: 'Chief Procurement Officer',
    role: 'Host',
  },
  participants: [
    {
      id: 'p_sarah',
      name: 'Sarah Jenkins',
      email: 'sarah.j@enterprise.com',
      role: 'Presenter',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      micOn: true,
      cameraOn: true,
    },
    {
      id: 'a_kenji',
      name: 'Kenji Arakawa',
      email: 'kenji.a@enterprise.com',
      role: 'Attendee',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      micOn: true,
      cameraOn: true,
    },
    {
      id: 'p_elena',
      name: 'Elena Rostova',
      email: 'elena.r@enterprise.com',
      role: 'Attendee',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
      micOn: false,
      cameraOn: true,
    },
  ],
  clientEmail: 'alexander.wright@apexglobal.com',
  clientName: 'Alexander Wright',
  clientCompany: 'Apex Global Enterprises',
};

export default function App() {// ─── ADD THIS CODE HERE (Triggers instantly when the page loads) ───
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const token = searchParams.get('token') || 'direct_visit';

    fetch(`${import.meta.env.VITE_BACKEND_URL || 'https://meeting-scheduled-conference.onrender.com'}/api/track-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'PAGE_VISIT',
        token: token,
        timestamp: new Date().toISOString()
      })
    }).catch(err => console.error('Visit tracking error:', err));
  }, []);
  const [config, setConfig] = useState<MeetingConfig>(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const token = searchParams.get('token');
    const email = searchParams.get('email');
    const name = searchParams.get('name');
    const company = searchParams.get('company');

    if (token) {
      const decoded = decodeMeetingConfig(token);
      if (decoded) {
        return {
          ...decoded.config,
          clientEmail: email || decoded.clientEmail || DEFAULT_CONFIG.clientEmail,
          clientName: name || decoded.clientName || DEFAULT_CONFIG.clientName,
          clientCompany: company || decoded.clientCompany || DEFAULT_CONFIG.clientCompany,
        };
      }
    }
    return DEFAULT_CONFIG;
  });

  const [clientEmail, setClientEmail] = useState<string>(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const email = searchParams.get('email');
    if (email) return email;

    const token = searchParams.get('token');
    if (token) {
      const decoded = decodeMeetingConfig(token);
      if (decoded?.clientEmail) return decoded.clientEmail;
    }
    return DEFAULT_CONFIG.clientEmail || 'alexander.wright@apexglobal.com';
  });

  const [clientName, setClientName] = useState<string>(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const name = searchParams.get('name');
    if (name) return name;

    const token = searchParams.get('token');
    if (token) {
      const decoded = decodeMeetingConfig(token);
      if (decoded?.clientName) return decoded.clientName;
    }
    return DEFAULT_CONFIG.clientName || 'Alexander Wright';
  });

  const [clientCompany, setClientCompany] = useState<string>(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const company = searchParams.get('company');
    if (company) return company;

    const token = searchParams.get('token');
    if (token) {
      const decoded = decodeMeetingConfig(token);
      if (decoded?.clientCompany) return decoded.clientCompany;
    }
    return DEFAULT_CONFIG.clientCompany || 'Apex Global Enterprises';
  });

  const [currentView, setCurrentView] = useState<AppView>(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('token')) {
      return 'client_lobby';
    }
    return 'admin_settings';
  });

  // Active meeting media streams passed from Lobby
  const [mediaState, setMediaState] = useState<{
    micEnabled: boolean;
    cameraEnabled: boolean;
    stream: MediaStream | null;
  }>({
    micEnabled: true,
    cameraEnabled: true,
    stream: null,
  });

  // Theme application
  useEffect(() => {
    const root = document.documentElement;
    const isDark =
      config.theme === 'dark' ||
      (config.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches) ||
      currentView === 'active_meeting' ||
      currentView === 'client_lobby';

    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [config.theme, currentView]);

  // Handle URL change or back button navigation
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      const email = params.get('email');
      const name = params.get('name');
      const company = params.get('company');

      if (token) {
        const decoded = decodeMeetingConfig(token);
        if (decoded) {
          setConfig({
            ...decoded.config,
            clientEmail: email || decoded.clientEmail || DEFAULT_CONFIG.clientEmail,
            clientName: name || decoded.clientName || DEFAULT_CONFIG.clientName,
            clientCompany: company || decoded.clientCompany || DEFAULT_CONFIG.clientCompany,
          });
          if (email || decoded.clientEmail) setClientEmail(email || decoded.clientEmail);
          if (name || decoded.clientName) setClientName(name || decoded.clientName);
          if (company || decoded.clientCompany) setClientCompany(company || decoded.clientCompany);
          setCurrentView('client_lobby');
        }
      } else {
        setCurrentView('admin_settings');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Launch Client Lobby with token & client metadata
  const handleOpenLobby = (token: string, email: string, name?: string, company?: string) => {
    const decoded = decodeMeetingConfig(token);
    if (decoded) {
      setConfig(decoded.config);
      if (decoded.clientName) setClientName(decoded.clientName);
      if (decoded.clientCompany) setClientCompany(decoded.clientCompany);
    }
    if (name) setClientName(name);
    if (company) setClientCompany(company);
    setClientEmail(email);

    // Update browser URL without reload for refresh persistence
    const url = new URL(window.location.href);
    url.searchParams.set('token', token);
    if (email) url.searchParams.set('email', email);
    if (name) url.searchParams.set('name', name);
    if (company) url.searchParams.set('company', company);
    window.history.pushState({}, '', url.toString());

    setCurrentView('client_lobby');
  };

  // Join meeting from lobby
  const handleJoinMeeting = async (incomingMedia: {
    micEnabled: boolean;
    cameraEnabled: boolean;
    stream: MediaStream | null;
  }) => {
    // ─── ADD THIS CODE HERE (Triggers when they click join) ───
    try {
      await fetch(`${import.meta.env.VITE_BACKEND_URL || 'https://meeting-scheduled-conference.onrender.com'}/api/track-event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'JOIN_CLICKED',
          client_email: clientEmail,
          client_name: clientName,
          client_company: clientCompany,
          timestamp: new Date().toISOString()
        })
      });
    } catch (err) {
      console.error('Join tracking error:', err);
    }
    setMediaState(incomingMedia);
    setCurrentView('active_meeting');
  };

  // Leave active meeting
  const handleLeaveMeeting = () => {
    if (mediaState.stream) {
      mediaState.stream.getTracks().forEach((track) => track.stop());
    }
    setMediaState({
      micEnabled: true,
      cameraEnabled: true,
      stream: null,
    });
    setCurrentView('client_lobby');
  };

  // Return to admin settings
  const handleBackToAdmin = () => {
    // Clear URL query
    const url = new URL(window.location.href);
    url.searchParams.delete('token');
    url.searchParams.delete('email');
    url.searchParams.delete('name');
    url.searchParams.delete('company');
    window.history.pushState({}, '', url.toString());

    setCurrentView('admin_settings');
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 font-sans antialiased text-slate-900 dark:text-slate-100">
      {currentView === 'admin_settings' && (
        <MeetingSettings
          config={config}
          onChange={setConfig}
          onOpenLobby={handleOpenLobby}
          currentJoinedCount={1}
        />
      )}

      {currentView === 'client_lobby' && (
        <MeetingLobby
          config={config}
          clientEmail={clientEmail}
          clientName={clientName}
          clientCompany={clientCompany}
          onJoinMeeting={handleJoinMeeting}
        />
      )}

      {currentView === 'active_meeting' && (
        <ActiveMeeting
          config={config}
          clientEmail={clientEmail}
          clientName={clientName}
          clientCompany={clientCompany}
          initialMediaState={mediaState}
          onLeaveMeeting={handleLeaveMeeting}
        />
      )}
    </div>
  );
}
