// Form.tsx

import React, { useState } from 'react';

interface FormProps {
  onFormSubmit: (formData: { numEvents: number; events: Array<{ eventName: string; length: number; precedingEvents: string }> }) => void;
  onResetData: () => void;
}

const Form: React.FC<FormProps> = ({ onFormSubmit, onResetData }) => {
  const [numEvents, setNumEvents] = useState<number>(1);
  const [formData, setFormData] = useState<Array<{ eventName: string; length: number; precedingEvents: string }>>(
    Array.from({ length: 1 }, () => ({ eventName: '', length: 0, precedingEvents: '' }))
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const { name, value } = e.target;
    setFormData((prevData) =>
      prevData.map((data, i) => (i === index ? { ...data, [name]: value } : data))
    );
  };

  const handleNumEventsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setNumEvents(value);
    setFormData(Array.from({ length: value }, () => ({ eventName: '', length: 0, precedingEvents: '' })));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const events: Array<{ eventName: string; length: number; precedingEvents: Array<number> }> = [];

    formData.forEach((event, index) => {
      const precedingEventsArray = event.precedingEvents.split(',').map((num) => parseInt(num.trim(), 10)).filter((num) => !isNaN(num));
      events.push({
        eventName: event.eventName,
        length: event.length,
        precedingEvents: precedingEventsArray,
      });
    });

    onFormSubmit({ numEvents, events });

    // Zresetuj dane formularza
    setNumEvents(1);
    setFormData(Array.from({ length: 1 }, () => ({ eventName: '', length: 0, precedingEvents: '' })));

    // Wywołaj funkcję do zresetowania danych w tablicach
    onResetData();
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Ilość wprowadzanych danych:
        <input type="number" name="numEvents" value={numEvents} onChange={handleNumEventsChange} />
      </label>

      {formData.map((event, index) => (
        <div key={index}>
          <label>
            Event {index + 1}:
            <input type="text" name="eventName" value={event.eventName} onChange={(e) => handleChange(e, index)} />
          </label>
          <label>
            Length:
            <input type="number" name="length" value={event.length} onChange={(e) => handleChange(e, index)} />
          </label>
          <label>
            Numery poprzedzających zdarzeń (oddzielone przecinkiem):
            <input type="text" name="precedingEvents" value={event.precedingEvents} onChange={(e) => handleChange(e, index)} />
          </label>
        </div>
      ))}

      <button type="submit">Dodaj</button>
    </form>
  );
};

export default Form;
