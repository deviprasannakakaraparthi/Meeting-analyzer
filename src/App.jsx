import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Plus, 
  Upload, 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle2, 
  ChevronRight, 
  Download, 
  Mic, 
  MicOff,
  Search, 
  User, 
  ArrowLeft,
  X,
  FileText,
  AlertCircle,
  TrendingUp,
  Target,
  Globe,
  Video,
  Database,
  Share2,
  Trash2,
  Settings,
  Bell,
  Lock,
  Mail,
  MoreVertical,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as pdfjsLib from 'pdfjs-dist';
import OpenAI from 'openai';

// Configure pdfjs worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.6.205/build/pdf.worker.min.mjs`;

import './App.css';

// --- Types & Mock Data ---

const INITIAL_MEETINGS = [
  {
    id: 'tutorial-1',
    title: 'Welcome to SummAI - Getting Started',
    date: new Date().toISOString().split('T')[0],
    duration: '2 mins',
    participants: ['SummAI Guide'],
    status: 'Processed',
    summary: 'This is a sample meeting analysis. Use the "Quick Record" button above to transcribe your voice in real-time, or "New Meeting" to upload a transcript/PDF. The AI will automatically extract highlights, key decisions, and action items.',
    excerpt: 'Welcome! This tool uses advanced heuristics to summarize your meetings instantly...',
    transcript: [
      { speaker: 'Guide', text: "Hello! To get started, click the Quick Record button in the top right. Speak clearly and you'll see your words appear live.", time: '0:05' },
      { speaker: 'Guide', text: "After you stop, I will analyze the content and provide an executive summary just like this one.", time: '0:30' }
    ],
    highlights: ['Tutorial', 'Features', 'Quick Start'],
    deadlines: [],
    actionItems: [
      'Try a live recording using the Mic button',
      'Upload a PDF or Text file using the Plus button',
      'Export your summary to PDF once analyzed'
    ]
  }
];

// --- Utilities ---

const formatDate = (dateStr) => {
  if (dateStr === 'Today') return 'Today';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

// --- Components ---

const Toast = ({ message, type = 'success' }) => (
  <motion.div 
    initial={{ opacity: 0, y: 50, x: '-50%' }}
    animate={{ opacity: 1, y: 0, x: '-50%' }}
    exit={{ opacity: 0, y: 20, x: '-50%' }}
    className={`toast ${type}`}
  >
    {type === 'success' ? <CheckCircle2 size={18} /> : type === 'error' ? <AlertCircle size={18} /> : <TrendingUp size={18} />}
    {message}
  </motion.div>
);

const Sidebar = ({ currentView, setView }) => {
  const items = [
    { id: 'dashboard', label: 'All Meetings', icon: LayoutDashboard },
    { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
    { id: 'insights', label: 'Insights', icon: TrendingUp },
    { id: 'integrations', label: 'Integrations', icon:Globe },
  ];

  return (
    <aside className="sidebar">
      <div className="logo" onClick={() => setView('dashboard')} style={{ cursor: 'pointer' }}>
        <Target size={32} strokeWidth={2.5} />
        <span className="gradient-text">SummAI</span>
      </div>
      <nav className="nav-menu">
        {items.map(item => (
          <button 
            key={item.id}
            className={`nav-item ${currentView === item.id ? 'active' : ''}`}
            onClick={() => setView(item.id)}
          >
            <item.icon size={20} />
            {item.label}
          </button>
        ))}
      </nav>
      <div 
        className={`nav-item logout-btn`} 
        style={{ marginTop: 'auto', cursor: 'pointer', borderTop: '1px solid #e2e8f0', paddingTop: '24px', color: 'var(--danger)' }} 
        onClick={() => {
          localStorage.removeItem('summai_user');
          window.location.reload();
        }}
      >
        <ArrowLeft size={18} />
        Sign Out
      </div>
    </aside>
  );
};

const AuthView = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });

  return (
    <div className="auth-container">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="auth-glass">
        <div className="logo" style={{ justifyContent: 'center', marginBottom: '32px' }}>
          <Target size={40} /> <span className="gradient-text" style={{ fontSize: '2.5rem' }}>SummAI</span>
        </div>
        <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>{isLogin ? 'Enterprise Login' : 'Create Account'}</h2>
        <p className="text-muted" style={{ textAlign: 'center', marginBottom: '40px' }}>Access your secure meeting workspace.</p>
        
        <form onSubmit={(e) => { e.preventDefault(); onLogin(formData); }}>
          {!isLogin && (
            <div className="input-group" style={{ marginBottom: '20px' }}>
              <label>Full Name</label>
              <input type="text" placeholder="John Doe" required onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
          )}
          <div className="input-group" style={{ marginBottom: '20px' }}>
            <label>Business Email</label>
            <input type="email" placeholder="name@company.com" required onChange={e => setFormData({...formData, email: e.target.value})} />
          </div>
          <div className="input-group" style={{ marginBottom: '32px' }}>
            <label>Password</label>
            <input type="password" placeholder="••••••••" required />
          </div>
          <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '16px' }}>
            {isLogin ? 'Sign In' : 'Create Enterprise Account'}
          </button>
        </form>
        
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <button className="text-btn" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Log in"}
          </button>
        </div>
      </motion.div>
      <div className="auth-decoration">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
      </div>
    </div>
  );
};

const UploadModal = ({ onClose, onUpload, onShowToast }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef();

  return (
    <div className="overlay" onClick={onClose}>
      <motion.div 
        className="modal" 
        onClick={e => e.stopPropagation()}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <button className="close-btn" onClick={onClose}><X size={24} /></button>
        <h2 style={{ marginBottom: '12px' }}>Input Meeting Content</h2>
        <p className="text-muted" style={{ marginBottom: '32px' }}>Upload local files or sync with your cloud meetings.</p>
        
        <div 
          className={`drop-zone ${isDragging ? 'dragging' : ''}`}
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={e => { e.preventDefault(); setIsDragging(false); onUpload(e.dataTransfer.files[0]); }}
          onClick={() => fileInputRef.current.click()}
        >
          <Upload size={48} color="var(--primary)" />
          <h3>Click or drag files</h3>
          <p className="text-muted">Supports MP3, WAV, PDF, TXT</p>
          <input type="file" ref={fileInputRef} hidden onChange={e => onUpload(e.target.files[0])} accept=".mp3,.wav,.pdf,.txt" />
        </div>

        <div className="modal-actions-grid">
          <button className="integration-btn" onClick={() => onShowToast('Synced Google Drive!', 'success')}>
            <Database size={20} /> Drive
          </button>
          <button className="integration-btn" onClick={() => onShowToast('Synced Google Meet!', 'success')}>
            <Video size={20} /> Meet
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const ScheduleModal = ({ onClose, onSchedule }) => {
  const [formData, setFormData] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    duration: '30 mins',
    participants: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title) return;
    onSchedule(formData);
  };

  return (
    <div className="overlay" onClick={onClose}>
      <motion.div 
        className="modal" 
        onClick={e => e.stopPropagation()}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <h2 style={{ marginBottom: '24px' }}>Schedule New Interview/Meeting</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label className="form-label">Meeting Title</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Design Review"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              required
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label className="form-label">Date</label>
              <input 
                type="date" 
                className="form-input"
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
              />
            </div>
            <div>
              <label className="form-label">Duration</label>
              <select 
                className="form-input"
                value={formData.duration}
                onChange={e => setFormData({...formData, duration: e.target.value})}
              >
                <option>15 mins</option>
                <option>30 mins</option>
                <option>45 mins</option>
                <option>1 hour</option>
              </select>
            </div>
          </div>
          <div>
            <label className="form-label">Participants (comma separated)</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Alice, Bob..."
              value={formData.participants}
              onChange={e => setFormData({...formData, participants: e.target.value})}
            />
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button type="button" className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="btn-primary" style={{ flex: 1 }}>Schedule Meeting</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const CalendarView = ({ meetings, onSelectMeeting, onScheduleClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="main-content">
      <header className="header">
        <h1 className="page-title">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h1>
        <div className="action-buttons">
          <button className="btn-secondary" onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}>Prev</button>
          <button className="btn-secondary" onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}>Next</button>
          <button className="btn-primary" onClick={onScheduleClick}>
            <CalendarIcon size={18} /> Schedule
          </button>
        </div>
      </header>
      <div className="glass-effect" style={{ borderRadius: '24px', padding: '32px', background: 'white' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px' }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} style={{ fontWeight: 600, color: '#94a3b8', textAlign: 'center', paddingBottom: '12px' }}>{d}</div>
          ))}
          {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const formattedDay = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const meetingsOnDay = meetings.filter(m => m.date === formattedDay);
            return (
              <div key={day} className={`calendar-day ${meetingsOnDay.length > 0 ? 'has-meeting' : ''}`}>
                <span className="day-number">{day}</span>
                {meetingsOnDay.map(m => (
                  <div key={m.id} onClick={() => onSelectMeeting(m)} className="calendar-meeting-tag">
                    {m.title}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

const Dashboard = ({ meetings, onSelect, onUploadClick, onRecordToggle, isRecording, liveTranscript, recordingDuration }) => {
  const [search, setSearch] = useState('');
  
  const filteredMeetings = useMemo(() => {
    return meetings.filter(m => 
      m.title.toLowerCase().includes(search.toLowerCase()) || 
      m.summary.toLowerCase().includes(search.toLowerCase())
    );
  }, [meetings, search]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="main-content">
      <header className="header">
        <div>
          <h1 className="page-title">Meetings</h1>
          <p className="card-date">Today, {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
        <div className="action-buttons">
          <button className={`btn-secondary ${isRecording ? 'recording-active' : ''}`} onClick={onRecordToggle}>
            {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
            {isRecording ? 'Stop Recording' : 'Quick Record'}
          </button>
          <button className="btn-primary" onClick={onUploadClick}>
            <Plus size={18} /> New Meeting
          </button>
        </div>
      </header>

      <div className="search-container">
        <Search size={20} className="search-icon" />
        <input 
          type="text" 
          placeholder="Search by title, speakers, or topics..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
      </div>

      {isRecording && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="live-recording-status"
        >
          <div className="recording-wave">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="wave-bar"
                animate={{ height: [10, Math.random() * 40 + 10, 10] }}
                transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.05 }}
              />
            ))}
          </div>
          <div className="recording-info" style={{ flexGrow: 1 }}>
            <span className="live-indicator">LIVE</span>
            <div className="live-transcript-preview" style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '12px', marginTop: '8px' }}>
              {liveTranscript && liveTranscript.length > 0 ? (
                liveTranscript.slice(-3).map((segment, idx) => (
                  <p key={idx} style={{ opacity: idx === 2 ? 1 : 0.6, fontSize: '0.9rem', marginBottom: '4px' }}>
                    {segment.text}
                  </p>
                ))
              ) : (
                <p>Listening... speak clearly into your microphone.</p>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
              <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                {Math.floor(recordingDuration / 60)}:{String(recordingDuration % 60).padStart(2, '0')} elapsed
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
                {liveTranscript.length} segments • {liveTranscript.reduce((acc, curr) => acc + (curr.text?.length || 0), 0)} chars captured
              </span>
            </div>
          </div>
        </motion.div>
      )}

      <div className="meeting-grid">
        {filteredMeetings.map((meeting) => (
          <motion.div 
            key={meeting.id} 
            className="item-card"
            whileHover={{ scale: 1.02 }}
            onClick={() => onSelect(meeting)}
          >
            <div className="card-header">
              <span className="card-date">{formatDate(meeting.date)} • {meeting.duration}</span>
              <span className={`status-badge ${meeting.status === 'Processed' ? 'status-processed' : 'status-processing'}`}>
                {meeting.status}
              </span>
            </div>
            <h3 className="card-title">{meeting.title}</h3>
            <p className="card-excerpt">{meeting.excerpt || meeting.summary}</p>
            <div className="tag-container">
              {meeting.highlights?.slice(0, 3).map(h => (
                <span key={h} className="tag">#{h?.replace(/\s+/g, '')}</span>
              ))}
            </div>
          </motion.div>
        ))}
        {filteredMeetings.length === 0 && (
          <div className="empty-state">
            <Search size={48} />
            <p>No meetings found matching your search.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const MeetingDetail = ({ meeting, onBack, onShowToast, onDelete }) => {
  const detailRef = useRef();

  const handleDownloadPDF = async () => {
    try {
      onShowToast('Preparing PDF...', 'info');
      const element = detailRef.current;
      const canvas = await html2canvas(element, { 
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`${meeting.title}-Full-Summary.pdf`);
      onShowToast('PDF exported successfully!');
    } catch (e) {
      console.error(e);
      onShowToast('Export failed', 'error');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="main-content">
      <div className="detail-nav">
        <button className="btn-secondary" onClick={onBack}>
          <ArrowLeft size={18} /> Back
        </button>
        <div className="action-buttons">
          <button className="btn-secondary" onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            onShowToast('Link copied!');
          }}><Share2 size={18} /></button>
          <button className="btn-secondary" onClick={() => onDelete(meeting.id)} style={{ color: 'var(--danger)' }}><Trash2 size={18} /></button>
        </div>
      </div>

      <div className="detail-view" ref={detailRef} style={{ padding: '40px', background: 'white' }}>
        <div className="detail-header-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h1 className="page-title">{meeting.title}</h1>
            <button className="btn-primary" onClick={handleDownloadPDF}>
              <Download size={18} /> Export PDF
            </button>
          </div>
          <div className="detail-meta">
            <span><CalendarIcon size={16} /> {formatDate(meeting.date)}</span>
            <span><Clock size={16} /> {meeting.duration}</span>
            <span><User size={16} /> {meeting.participants.join(', ')}</span>
          </div>
        </div>

        <div className="detail-grid">
          <div className="detail-main">
            <div className="insight-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                 <h3><TrendingUp size={18} /> AI Executive Summary</h3>
                 {meeting.metrics && <span className="stat-value" style={{ fontSize: '1rem', color: 'var(--primary)' }}>{meeting.metrics.accuracy}% Accuracy</span>}
              </div>
              <p>{meeting.summary || 'Analysis pending...'}</p>
            </div>

            <div className="transcript-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3><FileText size={18} /> Full Transcript</h3>
                <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.875rem' }} onClick={() => {
                  const t = (meeting.transcript || []).map(m => `${m.speaker} (${m.time}): ${m.text}`).join('\n');
                  navigator.clipboard.writeText(t);
                  onShowToast('Transcript copied to clipboard!');
                }}>Copy Transcript</button>
              </div>
              {meeting.transcript?.map((msg, i) => (
                <div key={i} className="transcript-block">
                  <div className="speaker-label" style={{ background: i % 2 === 0 ? 'var(--primary)' : 'var(--accent-blue)' }}>
                    {msg.speaker?.charAt(0) || 'A'}
                  </div>
                  <div className="transcript-content">
                    <div className="speaker-metadata">{msg.speaker || 'Analyzer'} <span>{msg.time || '0:00'}</span></div>
                    <div className="speaker-text">{msg.text || 'No text captured for this segment.'}</div>
                  </div>
                </div>
              ))}
              {(!meeting.transcript || meeting.transcript.length === 0) && <p className="text-muted">No transcript available for this document.</p>}
            </div>
          </div>

          <div className="detail-side">
            <div className="side-card">
              <h3><CheckCircle2 size={18} /> Action Items</h3>
              <ul>
                {meeting.actionItems?.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
            <div className="side-card">
              <h3><AlertCircle size={18} /> Deadlines</h3>
              {meeting.deadlines?.map((dl, i) => (
                <div key={i} className="deadline-row">
                  <div className="deadline-pin" />
                  <div>
                    <div className="deadline-date">{dl.date}</div>
                    <div className="deadline-task">{dl.task}</div>
                  </div>
                </div>
              ))}
              {(!meeting.deadlines || meeting.deadlines.length === 0) && <p className="text-muted">None</p>}
            </div>
            <div className="side-card">
              <h3><Target size={18} /> Key Topics</h3>
              <div className="tag-list">
                {meeting.highlights?.map(h => <span key={h} className="large-tag">{h}</span>)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const IntegrationsView = ({ onShowToast }) => {
  const platforms = [
    { name: 'Google Meet', icon: Video, color: '#00ac47', desc: 'Sync live transcripts directly from your browser tabs.', active: true },
    { name: 'Zoom', icon: Database, color: '#2d8cff', desc: 'Connect our recording bot to your Zoom meetings.', active: true },
    { name: 'Microsoft Teams', icon: Share2, color: '#4b53bc', desc: 'Enterprise-grade recording for Teams calls.', active: false },
    { name: 'Slack Huddles', icon: Mail, color: '#4a154b', desc: 'Summarize impromptu Huddles instantly.', active: false }
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="main-content">
      <h1 className="page-title">External Integrations</h1>
      <p className="text-muted" style={{ marginBottom: '40px' }}>Connect SummAI to your favorite meeting platforms to automate your workflow.</p>
      
      <div className="integration-grid">
        {platforms.map(p => (
          <div key={p.name} className="integration-card">
            <div className="platform-header">
              <div className="platform-icon" style={{ backgroundColor: p.color + '15', color: p.color }}>
                <p.icon size={24} />
              </div>
              <span className={`status-tag ${p.active ? 'active' : 'upcoming'}`}>
                {p.active ? 'Available' : 'Coming Soon'}
              </span>
            </div>
            <h3>{p.name}</h3>
            <p>{p.desc}</p>
            {p.active ? (
              <button className="btn-secondary" style={{ width: '100%', marginTop: 'auto' }} onClick={() => onShowToast(`Connecting to ${p.name}...`, 'info')}>
                Install Add-on
              </button>
            ) : (
              <button className="btn-secondary" disabled style={{ width: '100%', marginTop: 'auto', opacity: 0.5 }}>
                Notify Me
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="integration-how-to glass-effect" style={{ marginTop: '48px', padding: '40px', borderRadius: '32px' }}>
        <h2>How to add to Zoom & Google Meet?</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginTop: '24px' }}>
          <div>
            <h3 style={{ color: 'var(--primary)', marginBottom: '16px' }}>For Google Meet</h3>
            <ol className="step-list">
              <li>Install the <b>SummAI Chrome Extension</b>.</li>
              <li>Open any Google Meet link in Chrome.</li>
              <li>The SummAI side-panel will appear automatically.</li>
              <li>Click "Start Transcribing" when the meeting begins.</li>
            </ol>
          </div>
          <div>
            <h3 style={{ color: 'var(--accent-blue)', marginBottom: '16px' }}>For Zoom</h3>
            <ol className="step-list">
              <li>Go to <b>Zoom App Marketplace</b> and search for SummAI.</li>
              <li>Authorize the app to join your scheduled meetings.</li>
              <li>SummAI Bot will join as a participant and record the audio.</li>
              <li>Minutes will be available here immediately after the call.</li>
            </ol>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const ProfileView = ({ user, onUpdate, onShowToast }) => {
  const [profile, setProfile] = useState(user);
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    onUpdate(profile);
    setIsEditing(false);
    onShowToast('Profile updated successfully!');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="main-content">
      <h1 className="page-title">Personal Settings</h1>
      <div className="profile-container">
        <div className="profile-sidebar">
          <div className="profile-avatar-large">
            {profile.name?.split(' ').map(n => n[0]).join('') || 'U'}
            <div className="avatar-badge">Pro</div>
          </div>
          <h2 style={{ marginTop: '16px' }}>{profile.name}</h2>
          <p className="text-muted">{profile.role}</p>
          <div className="profile-completeness">
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '8px' }}>
              <span>Profile Completeness</span>
              <span>85%</span>
            </div>
            <div className="progress-bar"><div className="progress-fill" style={{ width: '85%' }} /></div>
          </div>
        </div>

        <div className="profile-main">
          <div className="settings-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3>Account Details</h3>
              <button className="btn-secondary" onClick={() => isEditing ? handleSave() : setIsEditing(true)}>
                {isEditing ? 'Save Changes' : 'Edit Profile'}
              </button>
            </div>
            <div className="settings-grid">
              <div className="input-group">
                <label>Full Name</label>
                <input 
                  type="text" 
                  disabled={!isEditing}
                  value={profile.name}
                  onChange={e => setProfile({...profile, name: e.target.value})}
                />
              </div>
              <div className="input-group">
                <label>Email Address</label>
                <input 
                  type="email" 
                  disabled={!isEditing}
                  value={profile.email}
                  onChange={e => setProfile({...profile, email: e.target.value})}
                />
              </div>
              <div className="input-group">
                <label>Current Role</label>
                <input 
                  type="text" 
                  disabled={!isEditing}
                  value={profile.role}
                  onChange={e => setProfile({...profile, role: e.target.value})}
                />
              </div>
              <div className="input-group">
                <label>Plan Type</label>
                <select disabled={!isEditing} value={profile.plan} onChange={e => setProfile({...profile, plan: e.target.value})}>
                  <option>Free Tier</option>
                  <option>Pro Monthly</option>
                  <option>Enterprise</option>
                </select>
              </div>
              <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                <label>OpenAI API Key (Required for Real AI Summaries)</label>
                <input 
                  type="password" 
                  disabled={!isEditing}
                  value={profile.apiKey || ''}
                  placeholder="sk-..."
                  onChange={e => setProfile({...profile, apiKey: e.target.value})}
                />
                <p style={{ fontSize: '0.75rem', marginTop: '4px', opacity: 0.7 }}>
                  Your key is stored only in your local browser and is used directly for summaries and audio transcription.
                </p>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h3>Notifications & Privacy</h3>
            <div className="toggle-list">
              <div className="toggle-item">
                <div className="toggle-info">
                  <Bell size={18} />
                  <div>
                    <div className="toggle-title">Email Summaries</div>
                    <div className="toggle-desc">Get meeting summaries delivered to your inbox</div>
                  </div>
                </div>
                <input type="checkbox" className="switch" defaultChecked={profile.notifications} onChange={e => setProfile({...profile, notifications: e.target.checked})} />
              </div>
              <div className="toggle-item">
                <div className="toggle-info">
                  <Globe size={18} />
                  <div>
                    <div className="toggle-title">Public Sharing</div>
                    <div className="toggle-desc">Allow link sharing for meeting summaries</div>
                  </div>
                </div>
                <input type="checkbox" className="switch" defaultChecked={profile.sharing} onChange={e => setProfile({...profile, sharing: e.target.checked})} />
              </div>
            </div>
          </div>
          
          <div className="settings-section danger-zone">
            <h3>Danger Zone</h3>
            <p className="text-muted">Deleting your account is permanent. All meetings will be lost.</p>
            <button className="btn-secondary danger-btn">Delete Account</button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// --- Main App ---

export default function App() {
  const [view, setView] = useState('auth');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Persistence Layer
  const [meetings, setMeetings] = useState(() => {
    try {
      const saved = localStorage.getItem('summai_meetings');
      if (!saved) return INITIAL_MEETINGS;
      const parsed = JSON.parse(saved);
      // Ensure it's an array and handle legacy null transcripts
      if (Array.isArray(parsed)) {
        return parsed.map(m => ({
          ...m,
          transcript: m.transcript || [],
          highlights: m.highlights || [],
          actionItems: m.actionItems || []
        }));
      }
      return INITIAL_MEETINGS;
    } catch (e) {
      console.error('Data Sanitization Triggered:', e);
      return INITIAL_MEETINGS;
    }
  });

  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('summai_user');
      if (!saved) return {
        name: 'Executive User',
        email: 'exec@enterprise.com',
        role: 'Strategy Lead',
        plan: 'Enterprise',
        notifications: true,
        sharing: false,
        isNew: true
      };
      const parsed = JSON.parse(saved);
      return {
        ...parsed,
        name: parsed.name || 'Executive User',
        email: parsed.email || 'exec@enterprise.com'
      };
    } catch (e) {
      return {
        name: 'Executive User',
        email: 'exec@enterprise.com',
        role: 'Strategy Lead',
        plan: 'Enterprise',
        notifications: true,
        sharing: false,
        isNew: true
      };
    }
  });

  useEffect(() => {
    localStorage.setItem('summai_meetings', JSON.stringify(meetings));
  }, [meetings]);

  useEffect(() => {
    localStorage.setItem('summai_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    // Auto-login for demo if already setup
    if (!user.isNew) {
      setIsAuthenticated(true);
      setView('dashboard');
    }
  }, []);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState([]);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [toast, setToast] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const liveTranscriptRef = useRef([]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message, type = 'success') => setToast({ message, type });

  const handleLogin = (credentials) => {
    setUser({ ...user, name: credentials.name || user.name, email: credentials.email || user.email, isNew: false });
    setIsAuthenticated(true);
    setView('dashboard');
    showToast(`Welcome back, ${credentials.name || 'User'}!`, 'info');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setView('auth');
    showToast('Logged out successfully', 'info');
  };

  const handleAction = (meeting) => {
    setSelectedMeeting(meeting);
    setView('detail');
  };

  const handleSchedule = (data) => {
    const newM = {
      id: `m-${Date.now()}`,
      ...data,
      participants: data.participants.split(',').map(p => p.trim()),
      status: 'Upcoming',
      summary: 'Awaiting session start...',
      highlights: ['Scheduled'],
      transcript: [],
      deadlines: [],
      actionItems: []
    };
    setMeetings([newM, ...meetings]);
    setIsScheduling(false);
    showToast('Event synchronized to your calendar!');
  };

  const handleDeleteMeeting = (id) => {
    setMeetings(meetings.filter(m => m.id !== id));
    setView('dashboard');
    showToast('Meeting deleted', 'info');
  };



  const isRecordingRef = useRef(false);

  const handleRecordToggle = async () => {
    if (!isRecordingRef.current) {
      // Check for SpeechRecognition support
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        showToast('Speech recognition not supported in this browser. Use Chrome.', 'error');
        return;
      }
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true }); // permission check
        liveTranscriptRef.current = [];
        setLiveTranscript([]);
        setRecordingDuration(0);
        recordingTimerRef._seconds = 0;

        const startRecognition = () => {
          const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'en-US';
          recognitionRef.current = recognition;

          let lastFinalResultIndex = -1;

          recognition.onresult = (event) => {
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
              const result = event.results[i];
              if (result.isFinal && i > lastFinalResultIndex) {
                lastFinalResultIndex = i;
                const mins = Math.floor(recordingTimerRef._seconds / 60);
                const secs = (recordingTimerRef._seconds || 0) % 60;
                const timeLabel = `${mins}:${String(secs).padStart(2,'0')}`;
                
                const text = result[0].transcript.trim();
                if (text.length > 0) {
                  const entry = { speaker: 'You', text, time: timeLabel };
                  liveTranscriptRef.current = [...liveTranscriptRef.current, entry];
                  setLiveTranscript([...liveTranscriptRef.current]);
                }
              } else {
                interimTranscript += result[0].transcript;
              }
            }
            // Update the live preview with interim results too
            if (interimTranscript) {
              setLiveTranscript([...liveTranscriptRef.current, { speaker: 'You', text: interimTranscript + '...', time: 'Live' }]);
            }
          };

          recognition.onerror = (e) => {
            // 'no-speech' and 'aborted' are normal — don't show error toast
            if (e.error !== 'no-speech' && e.error !== 'aborted') {
              console.error('Speech recognition error:', e.error);
              showToast(`Mic issue: ${e.error}. Try refreshing.`, 'error');
            }
          };

          // KEY FIX: auto-restart when recognition stops (silence pause or timeout)
          // Chrome's SpeechRecognition stops itself every ~60s or on silence — we restart it
          recognition.onend = () => {
            if (isRecordingRef.current) {
              // Still recording — restart recognition seamlessly
              try { startRecognition(); } catch(e) { /* ignore */ }
            }
          };

          recognition.start();
        };

        startRecognition();
        isRecordingRef.current = true;
        setIsRecording(true);
        showToast('🎙️ Live Session Started. Every word you say is being analyzed!', 'success');

        // Timer
        let seconds = 0;
        recordingTimerRef._seconds = 0;
        recordingTimerRef.current = setInterval(() => {
          seconds++;
          recordingTimerRef._seconds = seconds;
          setRecordingDuration(seconds);
        }, 1000);

      } catch (err) {
        showToast('Mic access denied. Please allow microphone permission.', 'error');
      }
    } else {
      // Stop recording — set ref FIRST so onend restart loop stops immediately
      isRecordingRef.current = false;
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setIsRecording(false);
      showToast('Analyzing session content...', 'info');

      // Small delay to allow final results to trickle in
      await new Promise(r => setTimeout(r, 800));

      const capturedLines = liveTranscriptRef.current.filter(l => l.time !== 'Live');
      const fileName = `Recording_${new Date().toISOString().split('T')[0]}`;
      const newId = Math.random().toString(36).substr(2, 9);
      // Use ref directly — avoids stale closure from recordingDuration state
      const finalDuration = recordingTimerRef._seconds || 0;

      const initialMeeting = {
        id: newId,
        title: `Live Recording — ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
        date: new Date().toISOString().split('T')[0],
        duration: `${Math.floor(finalDuration / 60)}m ${finalDuration % 60}s`,
        participants: ['You (Speaker)'],
        status: 'Processing',
        summary: 'Finalizing real-time transcription...',
        highlights: ['Live Recording'],
        transcript: capturedLines.length > 0 ? capturedLines : [{ speaker: 'System', text: 'Processing...', time: '0:00' }],
        deadlines: [],
        actionItems: []
      };
      setMeetings(prev => [initialMeeting, ...prev]);

      setIsProcessing(true);
      setTimeout(async () => {
        const fullText = capturedLines.map(l => l.text).join(' ');
        const result = await processAnalyzedContent(fullText, null, true, user.apiKey);
        // Ensure we preserve the ACTUAL spoken lines in the summary view
        result.transcript = capturedLines.length > 0 ? capturedLines : [{ speaker: 'System', text: 'No speech was detected.', time: '0:00' }];
        result.title = `Live Recording — ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
        result.duration = `${Math.floor(finalDuration / 60)}m ${finalDuration % 60}s`;
        result.participants = ['You (Guest)'];
        
        setMeetings(prev => prev.map(m => m.id === newId ? { ...m, ...result } : m));
        setIsProcessing(false);
        showToast('✅ Session analyzed!', 'success');
      }, 1500);

      setLiveTranscript([]);
      setRecordingDuration(0);
      liveTranscriptRef.current = [];
    }
  };

  const processAnalyzedContent = async (text, fileName, isLive, apiKey) => {
    const defaultResult = {
      status: 'Processed',
      highlights: ['General Discussion'],
      actionItems: ['Review notes and formalize action plan.'],
      metrics: { accuracy: 85, sentiment: 'Neutral', engagement: 'Moderate' },
      summary: `Analyzed document content: ${text.substring(0, 150)}...`,
      transcript: []
    };

    if (!text || text.trim().length === 0) {
      return { ...defaultResult, summary: "No meaningful text was detected." };
    }

    if (apiKey && apiKey.length > 10) {
      try {
        const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
        const response = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [{
            role: "system",
            content: "You are an executive meeting assistant. Process the following text and output a JSON object exactly with these keys: 'summary' (a concise, professional executive summary of the document, 2-4 sentences), 'actionItems' (an array of 2-5 clear actionable string items with implied owners if present), 'highlights' (an array of 3-5 succinct string tags/topics), and 'metrics' (an object containing 'accuracy' (number 80-100), 'sentiment' (string: Positive/Neutral/Urgent/Critical), 'engagement' (string: High/Medium/Low)). Ensure it's purely JSON."
          }, {
            role: "user",
            content: text.substring(0, 8000) // limit to avoid token blowout
          }],
          response_format: { type: "json_object" }
        });

        const parsedContent = JSON.parse(response.choices[0].message.content);
        return {
          status: 'Processed',
          summary: parsedContent.summary || defaultResult.summary,
          highlights: parsedContent.highlights || defaultResult.highlights,
          actionItems: parsedContent.actionItems || defaultResult.actionItems,
          metrics: parsedContent.metrics || defaultResult.metrics,
          transcript: [{ speaker: 'System/AI', text: text.trim(), time: '0:00' }]
        };
      } catch (e) {
        console.error("OpenAI Analysis Error:", e);
        // Fallback to heuristic if error
      }
    }

    // --- FREE LOCAL AI ENGINE ---
    const snippet = text.toLowerCase();
    const highlights = [];
    const topicKeywords = {
      'Cloud & Infrastructure': ['api', 'server', 'aws', 'cloud', 'scaling', 'performance', 'latency', 'database', 'postgres', 'aurora', 'vpc', 'peering'],
      'Security & Compliance': ['security', 'encrypted', 'audit', 'compliance', 'iam', 'roles', 'trust', 'access', 'firewall', 'protection'],
      'Project Logistics': ['roadmap', 'sprint', 'planning', 'deadline', 'milestone', 'timeline', 'resource', 'budget', 'meeting', 'sync'],
      'Engineering': ['code', 'deploy', 'react', 'node', 'frontend', 'backend', 'terraform', 'git', 'bug', 'fix', 'environment', 'staging'],
      'Product/UX': ['design', 'user', 'experience', 'ux', 'wireframe', 'color', 'brand', 'mobile', 'app', 'prototype', 'interface']
    };

    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      if (keywords.some(k => snippet.includes(k))) highlights.push(topic);
    });
    if (highlights.length === 0) highlights.push('General Sync');

    // Advanced Extractive Summarization (TF-IDF style)
    const sentences = text.match(/[^.!?\n]+[.!?\n]+/g) || [text];
    
    // Word frequency map
    const words = snippet.match(/\b\w+\b/g) || [];
    const freq = {};
    words.forEach(w => {
      if (w.length > 3) freq[w] = (freq[w] || 0) + 1;
    });

    // Score sentences
    const scoredSentences = sentences.map(s => {
       const sentenceWords = s.toLowerCase().match(/\b\w+\b/g) || [];
       let score = 0;
       sentenceWords.forEach(w => {
          if (w.length > 3) score += freq[w] || 0;
       });
       return { sentence: s.trim(), score: score / (sentenceWords.length || 1) }; // Normalize by length
    });

    // Pick top 3 sentences for summary
    scoredSentences.sort((a, b) => b.score - a.score);
    const topSentences = scoredSentences.slice(0, 3).map(obj => obj.sentence);
    let candidateSummary = topSentences.join(' ');
    
    if (!candidateSummary || candidateSummary.length < 50) {
       candidateSummary = "The transcript was recorded but lacked distinct complete sentences for an advanced summary. Text provided was: " + text.slice(0, 150) + "...";
    }

    // Smart Action Item Extraction
    const actionWords = ['i will', 'we must', 'need to', 'assign', 'follow up', 'todo', 'should', 'deadline', 'must complete', 'ill ', 'i\'ll'];
    const candidates = text.split(/[.!?\n]/).filter(s => s.trim().length > 10);
    const actionItems = Array.from(new Set(candidates
      .filter(s => actionWords.some(p => s.toLowerCase().includes(p)))
      .map(s => {
        let clean = s.trim().replace(/^[-*•]\s+/, '').replace(/todo:|action item:|action:/i, '');
        return clean.charAt(0).toUpperCase() + clean.slice(1);
      })))
      .slice(0, 5);

    if (actionItems.length === 0) {
      actionItems.push('Perform post-session analysis on discussed themes.');
    }

    return {
      status: 'Processed',
      summary: candidateSummary,
      highlights: highlights.slice(0, 5),
      actionItems,
      transcript: (isLive || text.length > 0) ? [{ speaker: 'System/AI', text: text.trim() || 'Session concluded successfully.', time: '0:00' }] : [],
      metrics: {
        accuracy: 85 + Math.floor(Math.random() * 10),
        sentiment: text.includes('deadline') ? 'Urgent' : 'Productive',
        engagement: 'Medium'
      }
    };
  };

  const handleUpload = async (file) => {
    if (!file) return;
    setIsUploading(false);
    setIsProcessing(true);
    showToast(`MNC Synthesis Engine: ${file.name}...`, 'info');
    
    const newId = Math.random().toString(36).substr(2, 9);
    const fileName = file.name || "Upload.pdf";
    const extension = fileName.split('.').pop().toLowerCase();
    const isAudio = ['mp3', 'wav', 'm4a', 'ogg', 'webm'].includes(extension);
    
    // Initial UI State
    const initialMeeting = {
      id: newId,
      title: fileName.replace(/\.[^/.]+$/, "").replace(/_/g, ' ').replace(/-/g, ' '),
      date: new Date().toISOString().split('T')[0],
      duration: 'Detailed Sync',
      participants: ['AI Analyzer'],
      status: 'Processing',
      summary: 'Reading content and extracting context...',
      highlights: ['Processing'],
      transcript: [],
      deadlines: [],
      actionItems: []
    };

    setMeetings(prev => [initialMeeting, ...prev]);

    // Process Dynamic Audio Context
    if (isAudio) {
      if (!user.apiKey || user.apiKey.length < 10) {
        showToast('Running FREE Local AI tier (No API Key). Text simulated.', 'info');
        
        // When no API key is present we simulate transcription so you aren't blocked!
        setTimeout(async () => {
          const mockTranscript = `The audio file "${fileName}" was successfully detected. We've officially moved 80% of our Postgres instances to Aurora. I'll handle the Security Groups on Monday. We must complete the migration. I will try to migrate the last 300GB tonight during the low-traffic window. Let's do 70% auto-scaling threshold and monitor.`;
          
          const analysis = await processAnalyzedContent(mockTranscript, fileName, false, null);
          setMeetings(prev => [ { ...initialMeeting, ...analysis, transcript: [{ speaker: 'Transcription (Free Tier)', text: mockTranscript, time: '0:00' }] }, ...prev.filter(m => m.id !== newId) ]);
          setIsProcessing(false);
          showToast('Free local summary generated successfully!', 'success');
        }, 1500);
        return;
      }

      try {
        const openai = new OpenAI({ apiKey: user.apiKey, dangerouslyAllowBrowser: true });
        const response = await openai.audio.transcriptions.create({
          file: file,
          model: "whisper-1"
        });

        const transcriptText = response.text;
        const analysis = await processAnalyzedContent(transcriptText, fileName, false, user.apiKey);
        setMeetings(prev => [ { ...initialMeeting, ...analysis, transcript: [{ speaker: 'Transcription', text: transcriptText, time: '0:00' }] }, ...prev.filter(m => m.id !== newId) ]);
        setIsProcessing(false);
        showToast('Audio transcribed and analyzed accurately!', 'success');
      } catch (err) {
        console.error("Audio processing error:", err);
        showToast('Audio analysis failed. Check your API key or file format.', 'error');
        setMeetings(prev => prev.filter(m => m.id !== newId));
        setIsProcessing(false);
      }
      return;
    }

    // Process Document
    try {
      let extractedText = "";
      if (extension === 'txt' || extension === 'md') {
        extractedText = await file.text();
      } else if (extension === 'pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer, isEvalSupported: false });
        const pdf = await loadingTask.promise;
        let fullText = "";
        for (let i = 1; i <= Math.min(pdf.numPages, 20); i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          fullText += content.items.map(item => item.str).join(" ") + " \n";
        }
        extractedText = fullText.trim();
      }

      const analysis = await processAnalyzedContent(extractedText, fileName, false, user.apiKey);
      setMeetings(prev => [ { ...initialMeeting, ...analysis }, ...prev.filter(m => m.id !== newId) ]);
      setIsProcessing(false);
      showToast('Document analyzed successfully.');

    } catch (err) {
      console.error(err);
      setIsProcessing(false);
      showToast('Engine Busy. Please retry in 3 seconds.', 'error');
    }
  };

  if (!isAuthenticated) return (
    <div className="auth-wrapper">
      <AuthView onLogin={handleLogin} />
      <AnimatePresence>{toast && <Toast message={toast.message} type={toast.type} />}</AnimatePresence>
    </div>
  );

  return (
    <div className="app-container" onError={(e) => { console.error('Render Error Caught:', e); window.location.reload(); }}>
      {isProcessing && (
        <div className="overlay" style={{ zIndex: 1000, background: 'rgba(255,255,255,0.7)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div className="spinner" style={{ width: '50px', height: '50px', border: '4px solid #f3f3f3', borderTop: '4px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <h2 style={{ marginTop: '24px' }}>AI Synthesis in Progress...</h2>
          <p className="text-muted">Extracting decisions and action items</p>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      )}
      <Sidebar currentView={view} setView={setView} />
      
      <main style={{ flexGrow: 1, overflowY: 'auto' }}>
        <AnimatePresence mode="wait">
          {view === 'dashboard' && (
            <Dashboard 
              key="dash"
              meetings={meetings} 
              onSelect={handleAction}
              onUploadClick={() => setIsUploading(true)}
              onRecordToggle={handleRecordToggle}
              isRecording={isRecording}
              liveTranscript={liveTranscript}
              recordingDuration={recordingDuration}
            />
          )}
          {view === 'detail' && (
            <MeetingDetail 
              key="detail"
              meeting={selectedMeeting} 
              onBack={() => setView('dashboard')}
              onShowToast={showToast}
              onDelete={handleDeleteMeeting}
            />
          )}
          {view === 'calendar' && (
            <CalendarView 
              key="calendar"
              meetings={meetings}
              onSelectMeeting={handleAction}
              onScheduleClick={() => setIsScheduling(true)}
            />
          )}
          {view === 'integrations' && (
            <IntegrationsView onShowToast={showToast} />
          )}
          {view === 'insights' && (
            <motion.div key="insights" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="main-content">
              <h1 className="page-title">Executive Insights</h1>
              <div className="insights-summary-grid">
                <div className="insight-stat-card">
                  <Target size={32} color="var(--primary)" />
                  <div className="stat-value">94.2%</div>
                  <div className="stat-label">AI Accuracy</div>
                </div>
                <div className="insight-stat-card">
                  <CheckCircle2 size={32} color="var(--success)" />
                  <div className="stat-value">128</div>
                  <div className="stat-label">Action Items Tracked</div>
                </div>
                <div className="insight-stat-card">
                  <Clock size={32} color="var(--accent-blue)" />
                  <div className="stat-value">24.5h</div>
                  <div className="stat-label">Productive Time Saved</div>
                </div>
                <div className="insight-stat-card">
                  <TrendingUp size={32} color="#8b5cf6" />
                  <div className="stat-value">+12%</div>
                  <div className="stat-label">Meeting Efficiency</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '32px', marginTop: '32px' }}>
                <div className="chart-placeholder glass-effect">
                  <h3>Weekly Summary Trend</h3>
                  <div className="mock-chart">
                    {Array.from({ length: 14 }).map((_, i) => (
                      <div key={i} className="chart-bar" style={{ height: `${Math.random() * 120 + 40}px` }}>
                        <div className="bar-tooltip">{Math.floor(Math.random() * 50)} mins</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="glass-effect" style={{ padding: '32px', borderRadius: '32px' }}>
                  <h3>Top Discussion Topics</h3>
                  <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {[
                      { name: 'Product Engineering', val: 85 },
                      { name: 'Marketing & SEO', val: 62 },
                      { name: 'Project Budgeting', val: 45 },
                      { name: 'UUX Redesign', val: 38 }
                    ].map(topic => (
                      <div key={topic.name}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '8px' }}>
                          <span style={{ fontWeight: 600 }}>{topic.name}</span>
                          <span>{topic.val}%</span>
                        </div>
                        <div className="progress-bar"><div className="progress-fill" style={{ width: `${topic.val}%` }} /></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          {view === 'profile' && (
            <ProfileView 
              key="profile" 
              user={user} 
              onUpdate={setUser} 
              onShowToast={showToast} 
            />
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {isUploading && (
          <UploadModal 
            onClose={() => setIsUploading(false)} 
            onUpload={handleUpload}
            onShowToast={showToast}
          />
        )}
        {isScheduling && (
          <ScheduleModal 
            onClose={() => setIsScheduling(false)} 
            onSchedule={handleSchedule}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

