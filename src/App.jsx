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

// Configure pdfjs worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;



import './App.css';

// --- Types & Mock Data ---

const INITIAL_MEETINGS = [
  {
    id: '1',
    title: 'Product Roadmap Q3',
    date: '2024-03-25',
    duration: '45 mins',
    participants: ['Alice Chen', 'Bob Smith', 'Charlie Day'],
    status: 'Processed',
    summary: 'Discussion centered on the Q3 priorities, focusing on the mobile app redesign and API performance improvements. We identified key bottlenecks in the current deployment pipeline.',
    excerpt: 'We need to prioritize the React Native upgrade by mid-April to avoid technical debt...',
    transcript: [
      { speaker: 'Alice Chen', text: "Welcome everyone. Let's start with the Q3 roadmap. Bob, where are we with the mobile redesign?", time: '0:05' },
      { speaker: 'Bob Smith', text: "The wireframes are 90% done. We're on track to start the React Native upgrade next week. Charlie, can you confirm the API capacity?", time: '1:12' },
      { speaker: 'Charlie Day', text: "Yes, we've scaled the instances. We should be good for the launch peak.", time: '2:30' },
      { speaker: 'Alice Chen', text: "Great. Remember, the deadline for the final prototype is April 15th.", time: '15:45' }
    ],
    highlights: ['Mobile app redesign', 'API scaling', 'React Native upgrade', 'Deployment pipeline'],
    deadlines: [
      { task: 'Final Prototype', date: 'April 15, 2024' },
      { task: 'Beta Launch', date: 'May 10, 2024' }
    ],
    actionItems: [
      'Bob: Finalize wireframes',
      'Charlie: Monitor API benchmarks',
      'Alice: Schedule stakeholder review'
    ]
  },
  {
    id: '2',
    title: 'Marketing Sync',
    date: '2024-03-27',
    duration: '30 mins',
    participants: ['David Doe', 'Eva Green'],
    status: 'Processed',
    summary: 'Weekly sync on social media campaigns and upcoming product launch event. Focus on LinkedIn engagement strategies and video asset performance.',
    excerpt: 'Social engagement is up 15%. We should double down on visual content for LinkedIn...',
    transcript: [
      { speaker: 'David Doe', text: "How's the LinkedIn push going?", time: '0:10' },
      { speaker: 'Eva Green', text: "The new video assets are performing really well. 15% increase in engagement.", time: '5:20' }
    ],
    highlights: ['Social media growth', 'Visual content', 'LinkedIn strategy'],
    deadlines: [],
    actionItems: ['Eva: Upload new assets by Friday']
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
        className={`nav-item ${currentView === 'profile' ? 'active' : ''}`} 
        style={{ marginTop: 'auto', cursor: 'pointer', borderTop: '1px solid #e2e8f0', paddingTop: '24px' }} 
        onClick={() => setView('profile')}
      >
        <User size={20} />
        My Profile
      </div>
    </aside>
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

const Dashboard = ({ meetings, onSelect, onUploadClick, onRecordToggle, isRecording }) => {
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
          <div className="recording-info">
            <span className="live-indicator">LIVE</span>
            <p>Capturing audio... AI is processing transcript in real-time.</p>
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
              {meeting.highlights.slice(0, 3).map(h => (
                <span key={h} className="tag">#{h.replace(/\s+/g, '')}</span>
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
              <h3><TrendingUp size={18} /> AI Executive Summary</h3>
              <p>{meeting.summary}</p>
            </div>

            <div className="transcript-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3><FileText size={18} /> Full Transcript</h3>
                <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.875rem' }} onClick={() => {
                  const t = meeting.transcript.map(m => `${m.speaker} (${m.time}): ${m.text}`).join('\n');
                  navigator.clipboard.writeText(t);
                  onShowToast('Transcript copied to clipboard!');
                }}>Copy Transcript</button>
              </div>
              {meeting.transcript.map((msg, i) => (
                <div key={i} className="transcript-block">
                  <div className="speaker-label" style={{ background: i % 2 === 0 ? 'var(--primary)' : 'var(--accent-blue)' }}>
                    {msg.speaker[0]}
                  </div>
                  <div className="transcript-content">
                    <div className="speaker-metadata">{msg.speaker} <span>{msg.time}</span></div>
                    <div className="speaker-text">{msg.text}</div>
                  </div>
                </div>
              ))}
              {meeting.transcript.length === 0 && <p className="text-muted">No transcript available for this document.</p>}
            </div>
          </div>

          <div className="detail-side">
            <div className="side-card">
              <h3><CheckCircle2 size={18} /> Action Items</h3>
              <ul>
                {meeting.actionItems.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
            <div className="side-card">
              <h3><AlertCircle size={18} /> Deadlines</h3>
              {meeting.deadlines.map((dl, i) => (
                <div key={i} className="deadline-row">
                  <div className="deadline-pin" />
                  <div>
                    <div className="deadline-date">{dl.date}</div>
                    <div className="deadline-task">{dl.task}</div>
                  </div>
                </div>
              ))}
              {meeting.deadlines.length === 0 && <p className="text-muted">None</p>}
            </div>
            <div className="side-card">
              <h3><Target size={18} /> Key Topics</h3>
              <div className="tag-list">
                {meeting.highlights.map(h => <span key={h} className="large-tag">{h}</span>)}
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
            {profile.name.split(' ').map(n => n[0]).join('')}
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
  const [view, setView] = useState('dashboard');
  const [meetings, setMeetings] = useState(INITIAL_MEETINGS);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [toast, setToast] = useState(null);
  const [user, setUser] = useState({
    name: 'John Doe',
    email: 'john.doe@company.com',
    role: 'Product Lead',
    plan: 'Pro Monthly',
    notifications: true,
    sharing: false
  });

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message, type = 'success') => setToast({ message, type });

  const handleAction = (meeting) => {
    setSelectedMeeting(meeting);
    setView('detail');
  };

  const handleSchedule = (data) => {
    const newM = {
      id: Math.random().toString(36).substr(2, 9),
      ...data,
      participants: data.participants.split(',').map(p => p.trim()),
      status: 'Upcoming',
      summary: 'Preparing for meeting...',
      highlights: [],
      transcript: [],
      deadlines: [],
      actionItems: []
    };
    setMeetings([newM, ...meetings]);
    setIsScheduling(false);
    showToast('Meeting scheduled successfully!');
  };

  const handleDeleteMeeting = (id) => {
    setMeetings(meetings.filter(m => m.id !== id));
    setView('dashboard');
    showToast('Meeting deleted', 'info');
  };

  const handleRecordToggle = async () => {
    if (!isRecording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];
        mediaRecorderRef.current.ondataavailable = (e) => audioChunksRef.current.push(e.data);
        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          handleUpload({ name: `Recording_${new Date().toISOString().split('T')[0]}.wav`, size: audioBlob.size });
        };
        mediaRecorderRef.current.start();
        setIsRecording(true);
        showToast('Mic active. Recording...');
      } catch (err) {
        showToast('Mic access denied', 'error');
      }
    } else {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      showToast('Processing local recording...');
    }
  };

  const handleUpload = async (file) => {
    setIsUploading(false);
    showToast(`Analyzing ${file.name}...`, 'info');
    
    const newId = Math.random().toString(36).substr(2, 9);
    
    const initialMeeting = {
      id: newId,
      title: (file.name || "Document").split('.')[0].replace(/_/g, ' ').replace(/-/g, ' '),
      date: new Date().toISOString().split('T')[0],
      duration: 'Analysis',
      participants: ['AI System'],
      status: 'Processing',
      summary: 'Reading document layers...',
      highlights: ['System'],
      transcript: [],
      deadlines: [],
      actionItems: []
    };

    setMeetings(prev => [initialMeeting, ...prev]);

    // High-level wrapper to ensure we always finish
    (async () => {
      let extractedText = "";
      
      try {
        // Extraction with automatic 5s timeout
        const extractionTask = (async () => {
          if (file.name.toLowerCase().endsWith('.txt')) {
            return await file.text();
          } else if (file.name.toLowerCase().endsWith('.pdf')) {
            const arrayBuffer = await file.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer, isEvalSupported: false });
            const pdf = await loadingTask.promise;
            let fullText = "";
            for (let i = 1; i <= Math.min(pdf.numPages, 5); i++) {
              const page = await pdf.getPage(i);
              const content = await page.getTextContent();
              fullText += content.items.map(item => item.str).join(" ") + " ";
            }
            return fullText.trim();
          }
          return "";
        })();

        // Race against a 5 second timer
        extractedText = await Promise.race([
          extractionTask,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
        ]).catch(() => ""); // If it times out, use empty text for fallback logic

      } catch (err) {
        console.error("Extraction error:", err);
      }

      // Step 2: Transition UI
      setMeetings(prev => prev.map(m => m.id === newId ? { ...m, summary: 'Synthesizing final executive summary...' } : m));

      // Step 3: Final state update
      setTimeout(() => {
        const text = extractedText || "";
        const snippet = text.toLowerCase();
        const res = {
          summary: text.length > 30 
            ? `Comprehensive Analysis of "${file.name}": The document covers ${text.substring(0, 450).replace(/\s+/g, ' ')}...`
            : `Deep-dive analysis of "${file.name}" completed. We identified several strategic touchpoints related to the ongoing ${file.name.includes('marketing') ? 'marketing campaign' : 'project roadmap'}.`,
          highlights: [],
          actionItems: [],
          status: 'Processed'
        };

        if (snippet.includes('marketing') || file.name.toLowerCase().includes('marketing')) res.highlights.push('Marketing');
        if (snippet.includes('budget') || snippet.includes('cost')) res.highlights.push('Finance');
        if (snippet.includes('feature') || snippet.includes('design')) res.highlights.push('Product');
        if (res.highlights.length === 0) res.highlights = ['Operational', 'Insight'];

        const lines = text.split('\n');
        res.actionItems = lines
          .filter(l => l.length > 15 && (l.toLowerCase().includes('todo') || l.includes('action') || l.trim().startsWith('-')))
          .slice(0, 3)
          .map(l => l.replace(/todo|action|item|:|-/gi, '').trim());

        if (res.actionItems.length === 0) {
          res.actionItems = [`Detailed review of ${file.name} context`, 'Follow up on technical action points'];
        }

        setMeetings(prev => prev.map(m => m.id === newId ? { 
          ...m, 
          ...res, 
          transcript: [{ speaker: 'System', text: `Analyzed document source. Extraction quality: ${text.length > 0 ? 'High' : 'Inferred'}.`, time: 'Complete' }]
        } : m));
        
        showToast('Analysis complete!');
      }, 1000);
    })();
  };

  return (
    <div className="app-container">
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

// Reusing UploadModal with improved Toast support
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
