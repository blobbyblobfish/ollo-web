import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getPrompt, getUploadUrl, submitResponse } from '../functions';

/* Upload one File/Blob via a Functions-issued signed PUT URL. Returns the path. */
async function uploadFile(token, kind, file) {
  const contentType = file.type || 'application/octet-stream';
  const { data } = await getUploadUrl({ token, kind, contentType });
  const res = await fetch(data.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  });
  if (!res.ok) throw new Error('Upload failed. Please try again.');
  return data.storagePath;
}

const Respond = () => {
  const { token } = useParams();

  const [status, setStatus] = useState('loading'); // loading|ready|error|done
  const [prompt, setPrompt] = useState(null);
  const [error, setError] = useState('');

  const [text, setText] = useState('');
  const [photos, setPhotos] = useState([]); // { file, url }
  const [recording, setRecording] = useState(false);
  const [audio, setAudio] = useState(null); // { blob, url }
  const [saving, setSaving] = useState(false);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  /* Load the prompt for this token. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await getPrompt({ token });
        if (cancelled) return;
        setPrompt(data);
        if (data.response?.text) setText(data.response.text);
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        setError(err?.message || 'This link is invalid.');
        setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  /* ---------- photos ---------- */
  const addPhotos = (e) => {
    const files = Array.from(e.target.files || []);
    setPhotos((p) => [
      ...p,
      ...files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    ]);
    e.target.value = ''; // allow re-selecting the same file
  };

  const removePhoto = (idx) =>
    setPhotos((p) => {
      URL.revokeObjectURL(p[idx].url);
      return p.filter((_, i) => i !== idx);
    });

  /* ---------- voice ---------- */
  const startRecording = useCallback(async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (ev) => ev.data.size && chunksRef.current.push(ev.data);
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: rec.mimeType || 'audio/webm',
        });
        setAudio((prev) => {
          if (prev?.url) URL.revokeObjectURL(prev.url);
          return { blob, url: URL.createObjectURL(blob) };
        });
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorderRef.current = rec;
      rec.start();
      setRecording(true);
    } catch (err) {
      setError('Microphone access was blocked. You can still write or add photos.');
    }
  }, []);

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const discardAudio = () =>
    setAudio((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url);
      return null;
    });

  /* ---------- submit ---------- */
  const canSubmit = text.trim() || photos.length || audio;

  const handleSubmit = async () => {
    if (!canSubmit || saving) return;
    setSaving(true);
    setError('');
    try {
      const photoPaths = [];
      for (const p of photos) {
        photoPaths.push(await uploadFile(token, 'photo', p.file));
      }
      const audioPaths = [];
      if (audio) audioPaths.push(await uploadFile(token, 'audio', audio.blob));

      await submitResponse({
        token,
        text: text.trim(),
        photos: photoPaths,
        audio: audioPaths,
      });
      setStatus('done');
    } catch (err) {
      setError(err?.message || 'Something went wrong saving your story.');
    }
    setSaving(false);
  };

  /* ---------- render (content computed once, single stable shell) ---------- */
  let content;

  if (status === 'loading') {
    content = <p className="q-help">Loading today's prompt…</p>;
  } else if (status === 'error') {
    content = (
      <>
        <div className="done-seal">⚠️</div>
        <h2 className="respond-q">This link isn't working.</h2>
        <p className="q-help">{error}</p>
      </>
    );
  } else if (status === 'done') {
    content = (
      <>
        <div className="done-seal">✦</div>
        <h2 className="respond-q">Saved. Thank you.</h2>
        <p className="q-help">
          Your story is safe in your family's private archive. You can return to
          this link anytime to add more.
        </p>
        <div className="respond-done-actions">
          <a className="btn btn-gold btn-lg" href="/archive">
            Go to the family archive →
          </a>
          <button
            className="link-btn"
            onClick={() => {
              setPhotos([]);
              discardAudio();
              setStatus('ready');
            }}
          >
            Add more to this story
          </button>
        </div>
      </>
    );
  } else {
    const greeting = prompt.storytellerName
      ? `Hi ${prompt.storytellerName.split(' ')[0]},`
      : 'Today’s prompt';
    content = (
      <>
        <p className="respond-eyebrow">
          {greeting} · {prompt.day}
        </p>
        <h2 className="respond-q">{prompt.promptText}</h2>
        {prompt.help && <p className="q-help">{prompt.help}</p>}
        {prompt.response && (
          <p className="respond-note">
            You've already added to this one — anything new will be saved
            alongside it.
          </p>
        )}

        <textarea
          className="trial-textarea"
          placeholder="Write as much or as little as you like…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={7}
        />

        <div className="respond-tools">
          <label className="btn btn-ghost respond-tool">
            📷 Add photos
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={addPhotos}
              hidden
            />
          </label>

          {!audio && !recording && (
            <button
              className="btn btn-ghost respond-tool"
              onClick={startRecording}
            >
              🎙️ Record voice
            </button>
          )}
          {recording && (
            <button
              className="btn btn-primary respond-tool"
              onClick={stopRecording}
            >
              ⏹ Stop recording
            </button>
          )}
        </div>

        {photos.length > 0 && (
          <div className="respond-thumbs">
            {photos.map((p, i) => (
              <div className="respond-thumb" key={i}>
                <img src={p.url} alt="" />
                <button onClick={() => removePhoto(i)} aria-label="Remove">
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {audio && (
          <div className="respond-audio">
            <audio src={audio.url} controls />
            <button className="link-btn" onClick={discardAudio}>
              Re-record
            </button>
          </div>
        )}

        {error && <p className="trial-error">{error}</p>}

        <button
          className="btn btn-gold btn-lg respond-submit"
          onClick={handleSubmit}
          disabled={!canSubmit || saving}
        >
          {saving ? 'Saving…' : 'Save my story'}
        </button>
      </>
    );
  }

  return (
    <div className="respond-page">
      <div className="respond-brand">
        <img src={`${process.env.PUBLIC_URL}/logo.svg`} alt="Our Love Lives On" />
        <span className="brand-name">Our Love Lives On</span>
      </div>
      <div className="respond-card">{content}</div>
    </div>
  );
};

export default Respond;
