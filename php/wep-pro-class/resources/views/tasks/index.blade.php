<div>
<a href="/tasks/new">/tasks/new</a>

<ul>
@foreach($tasks as $task)
<li> {{ $tasks-> label }} </li>
@endforeach

</ul>
<p>
this is index page</p>
</div>
