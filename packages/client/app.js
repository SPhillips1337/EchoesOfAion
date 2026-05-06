document.addEventListener('DOMContentLoaded', () => {
    const turnForm = document.getElementById('turnForm');
    const feedbackSection = document.getElementById('feedbackSection');
    const feedbackContent = document.getElementById('feedbackContent');
    const clearBtn = document.getElementById('clearBtn');

    // Handle form submission
    turnForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Clear previous feedback
        feedbackSection.style.display = 'none';
        feedbackContent.innerHTML = '';

        // Get form values
        const gameId = document.getElementById('gameId').value.trim();
        const empireId = document.getElementById('empireId').value.trim();
        const actionsText = document.getElementById('actions').value.trim();

        // Client-side UUID validation
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(gameId)) {
            showError('Invalid Game ID format. Please enter a valid UUID.');
            return;
        }
        if (!uuidRegex.test(empireId)) {
            showError('Invalid Empire ID format. Please enter a valid UUID.');
            return;
        }

        // Parse actions JSON
        let actions;
        try {
            actions = JSON.parse(actionsText);
            if (!Array.isArray(actions)) {
                showError('Actions must be a JSON array.');
                return;
            }
        } catch (parseError) {
            showError(`Invalid JSON in actions: ${parseError.message}`);
            return;
        }

        // Validate each action has required fields
        for (let i = 0; i < actions.length; i++) {
            const action = actions[i];
            if (!action.type || typeof action.type !== 'string') {
                showError(`Action at index ${i} missing 'type' field.`);
                return;
            }
            if (!action.payload || typeof action.payload !== 'object') {
                showError(`Action at index ${i} missing 'payload' object.`);
                return;
            }
            if (typeof action.turnNumber !== 'number' || action.turnNumber < 1) {
                showError(`Action at index ${i} requires 'turnNumber' as a positive integer.`);
                return;
            }
        }

        // Prepare request body
        const requestBody = {
            gameId,
            empireId,
            actions
        };

        // Submit to server
        try {
            const response = await fetch('/api/turns/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();

            if (response.ok) {
                showSuccess(data);
            } else {
                showError(data.error || `Server returned ${response.status}`);
            }
        } catch (networkError) {
            showError(`Network error: ${networkError.message}`);
        }
    });

    // Handle clear button
    clearBtn.addEventListener('click', () => {
        turnForm.reset();
        feedbackSection.style.display = 'none';
        feedbackContent.innerHTML = '';
    });

    function showSuccess(data) {
        feedbackSection.style.display = 'block';
        feedbackSection.className = 'feedback-section success';
        
        let html = `<div class="alert alert-success">${data.message || 'Turn submitted successfully!'}</div>`;
        html += `<p><strong>Turn Number:</strong> ${data.turnNumber}</p>`;
        
        if (data.resolvedState) {
            html += '<h3>Resolved State Summary:</h3>';
            html += `<p><strong>Stars:</strong> ${data.resolvedState.stars?.length || 0}</p>`;
            html += `<p><strong>Planets:</strong> ${data.resolvedState.planets?.length || 0}</p>`;
            html += `<p><strong>Fleets:</strong> ${data.resolvedState.fleets?.length || 0}</p>`;
            html += `<p><strong>Empires:</strong> ${data.resolvedState.empires?.length || 0}</p>`;
            
            // Show fleets with positions
            if (data.resolvedState.fleets && data.resolvedState.fleets.length > 0) {
                html += '<h4>Fleet Positions:</h4><ul>';
                data.resolvedState.fleets.forEach(fleet => {
                    html += `<li>${fleet.name || fleet.id}: at star ${fleet.star_id}</li>`;
                });
                html += '</ul>';
            }
        }
        
        feedbackContent.innerHTML = html;
    }

    function showError(message) {
        feedbackSection.style.display = 'block';
        feedbackSection.className = 'feedback-section error';
        feedbackContent.innerHTML = `<div class="alert alert-error">${message}</div>`;
    }
});
