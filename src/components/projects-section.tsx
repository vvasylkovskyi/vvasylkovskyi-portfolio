'use client';

import { Card } from './molecules/card';

const projects = [
  {
    iconPath: '/pagerduty-icon.svg',
    title: 'PagerDuty',
    subtitle: 'Real-time alerts and incident response for ops teams',
    url: 'https://www.pagerduty.com/',
    iconClassName: 'pager-duty-icon',
    width: 20,
    height: 20,
    date: '2025 - Present',
    role: 'Senior Software Engineer',
  },
  {
    iconPath: '/rely_logo.svg',
    title: 'RelyIO',
    subtitle: 'Internal Developer Portal',
    url: 'https://www.rely.io/',
    iconClassName: 'rely-icon',
    width: 30,
    height: 30,
    date: '2024 - 2025',
    role: 'Senior Product Engineer',
  },
  {
    iconPath: '/peacock-icon-white.svg',
    title: 'PeacockTV',
    subtitle: 'Stream shows, movies, and live TV anytime',
    url: 'https://www.peacocktv.com/',
    iconClassName: 'peacock-icon',
    width: 30,
    height: 30,
    date: '2020 - 2024',
    role: 'Senior Frontend Engineer',
  },
  //   {
  //     iconPath: '/sow-icon.webp',
  //     title: 'SOW Minerals',
  //     subtitle: 'Sustainable sourcing of critical mineral resources',
  //     url: 'https://sowminerals.com/',
  //   },
];

export const ProjectsSection = () => {
  return (
    <div>
      <h2 className='projects__title'>Work Experience</h2>
      <div className='project__section'>
        {projects.map((project) => (
          <Card
            key={project.title}
            iconPath={project.iconPath}
            title={project.title}
            subtitle={project.subtitle}
            url={project.url}
            iconClassName={project.iconClassName}
            width={project.width}
            height={project.height}
            date={project.date}
            role={project.role}
          />
        ))}
      </div>
    </div>
  );
};
