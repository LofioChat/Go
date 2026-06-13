import React, { useState, useRef, useEffect } from 'react';
import { auth, googleProvider, appleProvider } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';

export const AuthScreen = () => {
  const [authMode, setAuthMode] = useState('login'); // 'login', 'register', 'otp'
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '', email: '', phone: '', password: '', confirmPassword: '', firstName: '', lastName: ''
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState('Weak');

  // OTP State (5 digits)
  const [otp, setOtp] = useState(['', '', '', '', '']);
  const [timer, setTimer] = useState(60);
  const otpRefs = useRef([]);

  useEffect(() => {
    if (authMode === 'otp' && timer > 0) {
      const interval = setInterval(() => setTimer(prev => prev - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [authMode, timer]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (name === 'password') {
      setPasswordStrength(value.length > 8 ? 'Strong' : 'Weak');
    }
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    // Auto-focus next input
    if (value && index < 4) {
      otpRefs.current[index + 1].focus();
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
      alert('Login Successful!');
    } catch (error) {
      alert(error.message);
    }
  };

  const handleSocialLogin = async (provider) => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      alert(error.message);
    }
  };

  if (authMode === 'otp') {
    return (
      <div className="otp-container">
        <h2>Enter 5-digit Code</h2>
        <div className="otp-inputs">
          {otp.map((digit, idx) => (
            <input 
              key={idx} 
              ref={el => otpRefs.current[idx] = el}
              type="text" 
              value={digit} 
              onChange={(e) => handleOtpChange(idx, e.target.value)} 
              maxLength="1" 
            />
          ))}
        </div>
        <button>Confirm</button>
        <p>Resend OTP in {timer}s</p>
        <button disabled={timer > 0} onClick={() => setTimer(60)}>Resend OTP</button>
        <button onClick={() => setAuthMode('login')}>Try another way</button>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <h2>{authMode === 'login' ? 'Login' : 'Create Account'}</h2>
      <form onSubmit={authMode === 'login' ? handleLogin : () => setAuthMode('otp')}>
        
        {authMode === 'register' && (
          <>
            <input type="text" name="firstName" placeholder="First Name" onChange={handleInputChange} required />
            <input type="text" name="lastName" placeholder="Last Name" onChange={handleInputChange} required />
            <input type="text" name="username" placeholder="Username" onChange={handleInputChange} required />
            <small>Username availability: Checking...</small>
          </>
        )}

        <input type="text" name="email" placeholder="Email / Phone / Username" onChange={handleInputChange} required />
        
        <div className="password-input">
          <input 
            type={showPassword ? "text" : "password"} 
            name="password" 
            placeholder="Password" 
            onChange={handleInputChange} 
            required 
          />
          <span onClick={() => setShowPassword(!showPassword)}>👁️</span>
        </div>

        {authMode === 'register' && (
          <>
            <small>Password Strength: {passwordStrength}</small>
            <input type={showPassword ? "text" : "password"} name="confirmPassword" placeholder="Confirm Password" onChange={handleInputChange} required />
            <label><input type="checkbox" onChange={(e) => setAcceptedTerms(e.target.checked)} required /> I accept Terms & Conditions</label>
          </>
        )}

        <label><input type="checkbox" onChange={(e) => setRememberMe(e.target.checked)} /> Remember Password</label>
        
        {authMode === 'login' && <a href="#forgot">Forgot password?</a>}

        <button type="submit">{authMode === 'login' ? 'Login' : 'Create Account'}</button>
      </form>

      {authMode === 'login' ? (
        <p>I don't have an account. <span onClick={() => setAuthMode('register')}>Create an account</span></p>
      ) : (
        <p>I have an account. <span onClick={() => setAuthMode('login')}>Login</span></p>
      )}

      <div className="social-login">
        <button onClick={() => handleSocialLogin(googleProvider)}>Login with Google</button>
        <button onClick={() => handleSocialLogin(appleProvider)}>Login with Apple</button>
      </div>
    </div>
  );
};
