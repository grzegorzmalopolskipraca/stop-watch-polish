---
name: validating-polish-language
description: Validates that all user-facing text in the application is in Polish language. Checks buttons, labels, messages, errors, and notifications. Use when reviewing code, before commits, or ensuring Polish language compliance.
---

# Validating Polish Language

## Critical Rule

**ALL user-facing text MUST be in Polish.**

## Quick Check Commands

```bash
# Search for common English words in components
grep -r "Submit\|Cancel\|Delete\|Error\|Success\|Loading" src/components/ src/pages/

# Search for English in toast messages
grep -r "toast\." src/ | grep -i "success\|error"

# Search for English button text
grep -r "<Button" src/ | grep -v "className"
```

## Common English → Polish Translations

| English | Polish | Context |
|---------|--------|---------|
| Submit | Zgłoś / Wyślij | Forms |
| Cancel | Anuluj | Dialogs |
| Delete | Usuń | Actions |
| Save | Zapisz | Forms |
| Loading... | Ładowanie... | States |
| Error | Błąd | Errors |
| Success | Sukces / Pomyślnie | Messages |
| Traffic | Ruch | General |
| Street | Ulica | General |
| Direction | Kierunek | Traffic |
| Speed | Prędkość | Traffic |
| Report | Zgłoszenie | Traffic |
| Stopped | Stoi | Status |
| Moving | Toczy się | Status |
| Flowing | Jedzie | Status |
| No data | Brak danych | Empty states |

## Validation Checklist

### Components
- [ ] Button labels in Polish
- [ ] Placeholder text in Polish
- [ ] Helper text in Polish
- [ ] Error messages in Polish
- [ ] Success messages in Polish

### Toast Notifications
```typescript
// ✓ Correct
toast.success("Zgłoszenie wysłane!");
toast.error("Nie udało się zgłosić ruchu");

// ✗ Wrong
toast.success("Submitted successfully!");
toast.error("Failed to submit");
```

### Loading States
```typescript
// ✓ Correct
{isLoading && <div>Ładowanie...</div>}

// ✗ Wrong
{isLoading && <div>Loading...</div>}
```

### Empty States
```typescript
// ✓ Correct
{data.length === 0 && <p>Brak danych</p>}

// ✗ Wrong
{data.length === 0 && <p>No data available</p>}
```

### Form Validation
```typescript
// ✓ Correct
errors: {
  required: "To pole jest wymagane",
  minLength: "Minimalna długość to 3 znaki",
  maxLength: "Maksymalna długość to 100 znaków"
}

// ✗ Wrong
errors: {
  required: "This field is required",
  minLength: "Minimum length is 3",
  maxLength: "Maximum length is 100"
}
```

## Automated Check Script

```bash
#!/bin/bash
# check-polish.sh

echo "Checking for English text..."

# Common English words
ENGLISH_WORDS=("Submit" "Cancel" "Delete" "Save" "Loading" "Error" "Success" "Failed" "Please" "Click" "Enter")

for word in "${ENGLISH_WORDS[@]}"; do
  if grep -r "$word" src/components/ src/pages/ | grep -v "className\|import\|export\|console"; then
    echo "Found English word: $word"
  fi
done
```

## Exception: Code Elements

These CAN be in English (not user-facing):
- Variable names
- Function names
- File names
- Comments
- Console logs
- API endpoints
- Database column names
