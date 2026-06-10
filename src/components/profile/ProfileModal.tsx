import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { auth, updateUserPhotoURL } from '@/lib/firebaseConfig';
import { updateProfile } from 'firebase/auth';

interface ProfileModalProps {
  onClose: () => void;
}

export default function ProfileModal({ onClose }: ProfileModalProps) {
  const { user, refreshUser } = useAuth();
  
  const [name, setName] = useState(user?.displayName || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(user?.photoURL || null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Close modal on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Close modal on escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const convertFileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read file.'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsDataURL(file);
    });
  };

  const handleSave = async () => {
    if (!auth.currentUser) return;
    
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      let photoURL = auth.currentUser.photoURL;

      if (photoFile) {
        const fileDataUrl = await convertFileToDataUrl(photoFile);
        const response = await fetch('/api/profile/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: auth.currentUser.uid,
            fileName: photoFile.name,
            fileType: photoFile.type,
            fileData: fileDataUrl,
          }),
        });

        if (!response.ok) {
          const errorPayload = await response.json().catch(() => null);
          throw new Error(errorPayload?.error || 'Gagal mengunggah foto profil.');
        }

        const data = await response.json();
        photoURL = data.publicUrl;
      }

      await updateProfile(auth.currentUser, {
        displayName: name,
        photoURL,
      });

      if (photoFile && auth.currentUser.uid) {
        await updateUserPhotoURL(auth.currentUser.uid, photoURL);
      }

      refreshUser(); // Update Context so navbar updates
      setSuccess(true);
      
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan perubahan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modalOverlay">
      <div className="modalContent" ref={modalRef}>
        <button className="closeBtn" onClick={onClose} aria-label="Close modal">
          &times;
        </button>
        
        <h2 className="title">Edit Profile</h2>

        <div className="avatarWrap">
          {photoPreview ? (
            <img src={photoPreview} alt="Profile Preview" className="avatarImg" />
          ) : (
            <div className="avatarInitial">
              {user?.displayName?.charAt(0).toUpperCase() || "A"}
            </div>
          )}

          <div className="avatarAction">
            <span onClick={() => fileInputRef.current?.click()}>
              Upload Foto Baru
            </span>
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handlePhotoChange} 
            />
          </div>
        </div>

        <div className="form">
          <div className="field">
            <label>Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Masukkan nama"
            />
          </div>

          <div className="field">
            <label>Email</label>
            <input type="email" value={user?.email || ''} disabled className="disabled" />
            <small className="helpText">Email tidak dapat diubah</small>
          </div>

          {error && <p className="errorMsg">{error}</p>}
          {success && <p className="successMsg">Perubahan berhasil disimpan!</p>}

          <button className="saveBtn" onClick={handleSave} disabled={loading}>
            {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>

      <style jsx>{`
        .modalOverlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
        }

        .modalContent {
          background: #fff;
          width: 90%;
          max-width: 420px;
          border-radius: 20px;
          padding: 24px;
          position: relative;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15);
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .closeBtn {
          position: absolute;
          top: 16px;
          right: 20px;
          background: none;
          border: none;
          font-size: 28px;
          color: #818a9d;
          cursor: pointer;
          transition: color 0.2s;
        }

        .closeBtn:hover {
          color: #111;
        }

        .title {
          font-size: 20px;
          font-weight: 700;
          color: #232734;
          text-align: center;
          margin-bottom: 24px;
        }

        .avatarWrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
        }

        .avatarImg {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          object-fit: cover;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
        }

        .avatarInitial {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ce2f2f, #9a1414);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          font-weight: 700;
          box-shadow: 0 4px 10px rgba(206, 47, 47, 0.2);
        }

        .avatarAction span {
          color: #ce2f2f;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: opacity 0.2s;
        }

        .avatarAction span:hover {
          opacity: 0.8;
        }

        .form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        label {
          font-size: 13px;
          font-weight: 600;
          color: #51596d;
        }

        input {
          padding: 12px 14px;
          border-radius: 10px;
          border: 1px solid #d8dde9;
          font-size: 14px;
          color: #232734;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        input:focus {
          border-color: #ce2f2f;
          box-shadow: 0 0 0 3px rgba(206, 47, 47, 0.1);
        }

        .disabled {
          background: #f8fafc;
          color: #818a9d;
          cursor: not-allowed;
        }

        .helpText {
          font-size: 11px;
          color: #a0a8b8;
        }

        .saveBtn {
          margin-top: 8px;
          background: linear-gradient(120deg, #ce2f2f, #961414);
          color: white;
          border: none;
          padding: 14px;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .saveBtn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 15px rgba(206, 47, 47, 0.25);
        }

        .saveBtn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .errorMsg {
          color: #d32f2f;
          font-size: 13px;
          background: #ffebee;
          padding: 10px;
          border-radius: 8px;
          text-align: center;
        }

        .successMsg {
          color: #2e7d32;
          font-size: 13px;
          background: #e8f5e9;
          padding: 10px;
          border-radius: 8px;
          text-align: center;
        }
      `}</style>
    </div>
  );
}
