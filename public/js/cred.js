<<<<<<< HEAD
=======
function rememberUserProfile(profile) {
    if (!profile || !profile.email) return;

    const displayName = profile.displayName || profile.display_name || profile.username;
    if (!displayName) return;

    localStorage.setItem('userProfile', JSON.stringify({
        email: profile.email,
        displayName,
        username: displayName,
        guest: false
    }));
}

>>>>>>> ff605ed (improvements)
document.addEventListener('DOMContentLoaded', function() {
    const passwordInput = document.getElementById('signup-password');
    const strengthMeter = document.querySelector('.strength-meter');
    const strengthText = document.querySelector('.strength-text');
    const displayNameInput = document.getElementById('display-name');

    // Prevent spaces in display name
    displayNameInput?.addEventListener('input', function(e) {
        const value = e.target.value;
        if (value.includes(' ')) {
            e.target.value = value.replace(/\s/g, '');
        }
    });

    // Password strength checker
    function checkPasswordStrength(password) {
        let strength = 0;
        const patterns = [
            /[a-z]/, // lowercase
            /[A-Z]/, // uppercase
            /[0-9]/, // numbers
            /[^A-Za-z0-9]/ // special characters
        ];

        patterns.forEach(pattern => {
            if (pattern.test(password)) strength++;
        });

        if (password.length >= 8) strength++;

        return strength;
    }

    // Update password strength indicator
    passwordInput?.addEventListener('input', function(e) {
        const password = e.target.value;
        const strength = checkPasswordStrength(password);
        const colors = ['#ff4d4d', '#ffa64d', '#ffff4d', '#4dff4d'];
        const messages = ['Weak', 'Fair', 'Good', 'Strong'];

        strengthMeter.style.background = `linear-gradient(to right, ${colors[strength-1]} ${strength*25}%, #ddd ${strength*25}%)`;
        strengthText.textContent = password ? messages[strength-1] : '';
    });

    // Message display helper
    function showMessage(message, type = 'error') {
        const statusDiv = document.getElementById('status-message');
        statusDiv.textContent = message;
        statusDiv.className = `status-message ${type}`;

        // If it's a success message, redirect after showing it
        if (type === 'success') {
            setTimeout(() => {
                window.location.href = './welcome.html';
            }, 1500); // Show success message for 1.5 seconds before redirect
        }
    }

    // Attach showMessage to the window object for global accessibility
    window.showMessage = showMessage;

    // Form submission handler
    const form = document.getElementById('signup-form');
    form?.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Clear any existing messages
        const statusDiv = document.getElementById('status-message');
        statusDiv.className = 'status-message';
        statusDiv.textContent = '';

        // Disable form while submitting
        const submitButton = form.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing up...';
        
        try {
            // Convert FormData to JSON and validate
            const formData = new FormData(this);
            const formJson = {
                email: formData.get('email')?.trim(),
                password: formData.get('password'),
                display_name: formData.get('display_name')?.trim()
            };

<<<<<<< HEAD
=======
            if (/^guest_\d+$/i.test(formJson.display_name || '')) {
                showMessage('Display names like guest_1 are reserved for guest accounts. Please choose another name.', 'error');
                document.getElementById('display-name')?.focus();
                return;
            }

>>>>>>> ff605ed (improvements)
            console.log('Sending signup data:', formJson); // Debug log

            const response = await fetch('/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formJson)
            });
            
            // Handle response
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const responseData = await response.json();
                if (response.ok) {
<<<<<<< HEAD
                    showMessage('Account created successfully! Redirecting...', 'success');
                    return;
                } else {
                    throw new Error(responseData.message || 'Signup failed');
                }
            } else {
                const text = await response.text();
                console.error('Non-JSON response:', text);
                throw new Error('Server error. Please try again.');
            }

            // Handle JSON responses
            if (response.ok) {
                showMessage('Account created successfully! Redirecting...', 'success');
            } else {
                console.log('Error response:', responseData); // Debug log
                // Handle specific error cases
                switch(responseData.error) {
                    case 'EMAIL_EXISTS':
                        showMessage('This email is already registered. Please log in.', 'info');
                        // Optionally show login link
=======
                    rememberUserProfile({
                        email: formJson.email,
                        displayName: responseData.user?.displayName || responseData.user?.display_name || formJson.display_name
                    });
                    showMessage('Account created successfully! Redirecting...', 'success');
                    return;
                }
                
                switch(responseData.error) {
                    case 'EMAIL_EXISTS':
                        showMessage('This email is already registered. Please log in.', 'info');
>>>>>>> ff605ed (improvements)
                        setTimeout(() => {
                            window.location.href = '/login.html';
                        }, 2000);
                        break;
                    case 'DISPLAY_NAME_EXISTS':
                        showMessage('This display name is already taken. Please choose another one.', 'error');
                        // Focus the display name input
                        document.getElementById('display-name')?.focus();
                        break;
                    case 'INVALID_EMAIL':
                        showMessage('Please enter a valid email address.', 'error');
                        break;
                    case 'INVALID_DISPLAY_NAME':
                        showMessage('Display name can only contain letters, numbers, underscores and hyphens.', 'error');
                        break;
                    case 'WEAK_PASSWORD':
<<<<<<< HEAD
                        showMessage('Password must be at least 8 characters long.', 'error');
                        break;
                    default:
                        showMessage(data.message || 'Failed to sign up. Please try again.', 'error');
                }
            }
=======
                        showMessage('Weak password: password must be at least 8 characters long.', 'error');
                        passwordInput?.focus();
                        break;
                    case 'RESERVED_DISPLAY_NAME':
                        showMessage(responseData.message || 'Display names like guest_1 are reserved for guest accounts. Please choose another name.', 'error');
                        document.getElementById('display-name')?.focus();
                        break;
                    default:
                        showMessage(responseData.message || 'Failed to sign up. Please try again.', 'error');
                }
                return;
            }

            const text = await response.text();
            console.error('Non-JSON response:', text);
            throw new Error('Server error. Please try again.');
>>>>>>> ff605ed (improvements)
        } catch (error) {
            console.error('Form submission error:', error);
            if (error.message.includes('display name')) {
                showMessage(error.message, 'error');
            } else if (error.message.includes('email')) {
                showMessage(error.message, 'info');
            } else {
                showMessage('Server error. Please try again later.', 'error');
            }
        } finally {
            // Re-enable form
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
    });
});

// Password visibility toggle - direct implementation
function togglePassword() {
    const input = document.getElementById('signup-password');
    const icon = document.querySelector('#signup-password + .password-toggle i');
    if (!input || !icon) return;
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

function togglePasswordForLogIn() {
    const input = document.getElementById('login-password');
    const icon = document.querySelector('#login-password + .password-toggle i');
    if (!input || !icon) return;
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Device ID management - generate unique device ID for this device
function getOrCreateDeviceId() {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
        deviceId = 'dev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
}

// Login form handler
const loginForm = document.getElementById('login-form');
loginForm?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Clear any existing messages
    const statusDiv = document.getElementById('status-message');
    statusDiv.className = 'status-message';
    statusDiv.textContent = '';

    // Disable form while submitting
    const submitButton = loginForm.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
    
    try {
        // Get form data and device ID
        const formData = new FormData(this);
        const deviceId = getOrCreateDeviceId();
        const formJson = {
            email: formData.get('email')?.trim(),
            password: formData.get('password'),
            deviceId: deviceId
        };

        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formJson)
        });
        
        // Handle response
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const responseData = await response.json();
            if (response.ok) {
<<<<<<< HEAD
=======
                rememberUserProfile({
                    email: responseData.user?.email || formJson.email,
                    displayName: responseData.user?.displayName || responseData.user?.display_name
                });
>>>>>>> ff605ed (improvements)
                // Show success message
                showMessage('Login successful! Redirecting...', 'success');
                // Wait for 2 seconds before redirecting
                setTimeout(() => {
                    window.location.href = '/welcome.html';
                }, 2000); // Changed to 2000ms (2 seconds)
                return;
            } else {
                throw new Error(responseData.message || 'Login failed');
            }
        } else {
            const text = await response.text();
            console.error('Non-JSON response:', text);
            throw new Error('Server error. Please try again.');
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage(error.message || 'Login failed. Please check your credentials and try again.', 'error');
    } finally {
        // Re-enable form
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonText;
    }
<<<<<<< HEAD
});
=======
});
>>>>>>> ff605ed (improvements)
