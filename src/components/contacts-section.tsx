'use client';

import { Card } from './molecules/card';

const contacts = [
  {
    iconPath: '/linkedin-icon.svg',
    title: 'LinkedIn',
    url: 'https://www.linkedin.com/in/viktor-vasylkovskyi-708b1712b/',
    width: 18,
    height: 18,
  },
  {
    iconPath: '/github-icon--dark-mode.svg',
    title: 'Github',
    url: 'https://github.com/vvasylkovskyi',
    width: 18,
    height: 18,
  },
];

export const ContactsSection = () => {
  return (
    <div>
      <h2 className='projects__title'>Contacts</h2>
      <div className='project__section'>
        {contacts.map((contact) => (
          <Card
            key={contact.title}
            iconPath={contact.iconPath}
            title={contact.title}
            url={contact.url}
            width={contact.width}
            height={contact.height}
            isSmallCard={true}
          />
        ))}
      </div>
    </div>
  );
};
